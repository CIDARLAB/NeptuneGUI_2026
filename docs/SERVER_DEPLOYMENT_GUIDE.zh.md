# Neptune GUI + Compute 服务器部署与集成说明（中文）

本文档供部署与维护同事使用，说明如何将 **NeptuneGUI_2026**（Web 前端 + Express 数据服务）与 **Compute 后端**（Modal 上的 `modal_app.py`，内嵌 Neptune_2026 / fluigi）联调上线，以及用户点击 **Compile** 后前后端之间的数据流、Primitives Server 安排、Jobs 界面行为约定。

---

## 1. 总体架构

```
浏览器 (Vue, :8081 开发 / Fly HTTPS 生产)
    │  REST /api/v1/*
    ▼
Express Data Server (NeptuneGUI, :8080)
    │  鉴权、Workspace/文件、Component Library
    │  组装 sourceContent + componentBundle
    │  代理 compile / job 查询
    ▼
Modal Compute API (modal_app.py)
    │  每 worker 容器：fluigi + 3DuF primitives（容器内复用）
    │  临时目录写 bundle → fluigi synthesize / synthesizeFromMINT
    ▼
输出：*_PR.json、评估分项、日志；清理本 job 临时文件
    │
    ▼
Express 将结果 JSON 写入用户 Workspace（Data/ 卷）
    │
    ▼
Jobs 界面（Solutions）展示状态、Workspace、评估分数、JSON 操作
```

| 组件 | 职责 | 部署位置 |
|------|------|----------|
| **NeptuneGUI 前端** | Editor、Component Library、Jobs | Fly.io 容器内 `dist/` |
| **Express (`server/`)** | 会话、文件、组件库、compile 代理 | 同 Fly 容器，端口 `8080` |
| **持久卷 `Data/`** | Workspaces、用户上传、组件 DIY 覆盖 | Fly volume `/app/Data` |
| **`seed-data/`** | 内置默认组件（镜像内，只读） | 镜像构建时 COPY，启动时合并到逻辑路径 |
| **Modal Compute** | fluigi 编译、primitives、job 状态 | `modal deploy modal_app.py` |
| **Neptune_2026 源码** | fluigi、evaluation_metric | Modal 镜像 build 时从 GitHub clone |

**重要：** GUI 容器 **不** 运行 fluigi，也 **不需要** 单独部署全局 Primitives Server。Primitives 由 Modal compute 容器在 **worker 生命周期内懒加载并复用**。

---

## 2. 部署步骤

### 2.1 前置条件

- Fly.io 账号、`flyctl` 已登录
- Modal 账号、`modal` CLI 已登录
- GitHub Token（Secret 名 `neptune-github`），可 clone 私有仓库 `CIDARLAB/Neptune_2026`（含 submodules）
- **Neptune_2026** 中 `fluigi/component_library.py` 的 GUI JSON 解析改动已 **push 到 Modal 构建所用的分支**（否则线上 compile 无法正确使用前端组件数据）

### 2.2 部署 Compute（Modal）

```bash
cd NeptuneGUI_2026
# 首次：在 Modal 控制台创建 Secret neptune-github，值为 GITHUB_TOKEN
modal deploy modal_app.py
```

记录输出的 HTTPS 根 URL，例如：

`https://<workspace>--neptune-compute-api.modal.run`

### 2.3 部署 GUI（Fly.io）

```bash
cd NeptuneGUI_2026
fly secrets set NEPTUNE_COMPILE_URL=https://<workspace>--neptune-compute-api.modal.run
fly deploy
```

`fly.toml` 已将卷 `neptune_data` 挂载到 `/app/Data`。镜像内 `seed-data/3DuF_component/default/` 在启动时通过 `dataLayer.js` **回退读取**，避免空卷导致 Component Library 列表为空。

### 2.4 启动后自检

查看 Fly 日志应包含：

```text
Component library defaults: 9 type(s) [channel, mixer, ...]
Bundled seed root: /app/seed-data (present)
Neptune Data server running at http://localhost:8080
```

浏览器打开站点 → **Component Library** 应显示约 9 个内置组件。

---

## 3. Primitives Server 如何安排

### 3.1 生产（Modal）——推荐方式

- **不需要** 在 Fly 或单独 VM 上常驻 3DuF。
- `modal_app.py` 在每个 **compute worker 容器** 内：
  1. 第一次 compile job 时启动 3DuF（`localhost:6060`）；
  2. 同容器后续 job **复用** 该进程（`primitivesReused: true`）；
  3. Modal 回收容器时进程一并结束。
- fluigi 环境变量：`PRIMITIVE_SERVER_URI=http://localhost:6060`。

### 3.2 查找顺序（与本地 CLI 一致）

对设计中每个组件类型：

1. 本次请求 `componentBundle` → `--component-library <job-tmp>/JSON`
2. Neptune 仓库默认 `user_components/`（若存在）
3. **Primitives Server**（bundle 未覆盖的类型）

因此：**即使每次 compile 都带 componentBundle，仍必须在 compute 侧能访问 primitives**（除非保证设计中只用 bundle 内已完整定义的类型）。

### 3.3 本地开发对照

| 场景 | Primitives |
|------|------------|
| devcontainer 手跑 `fluigi` | 宿主机 Docker：`docker run -p 6070:6060 primitives-server` |
| GUI + `modal serve` | 无需手动启动，Modal 容器内自动处理 |

---

## 4. 用户点击 Compile 后的数据流

### 4.1 前端 → Express（`POST /api/v1/mushroommapper` 或 `/api/v1/fluigi`）

Editor 在 compile 前拉取 `/api/v1/componentFiles`，组装请求体：

```json
{
  "sourcefileid": "<当前 LFR/MINT 文件 id>",
  "sourcefilename": "design.lfr",
  "configfileid": "<可选配置 json 文件 id>",
  "configfilename": "config.json",
  "workspace": "<当前 workspace _id>",
  "user": "<用户 email 或 guest>",
  "componentBundle": [ /* 见下 */ ],
  "evaluationWeights": {
    "area": 0.2,
    "compact": 0.2,
    "connectionLength": 0.2,
    "bend": 0.2,
    "symmetry": 0.1,
    "fragmentation": 0.1
  }
}
```

> **说明：** `componentBundle` 与 Express 侧 merge 逻辑 **已实现**。`evaluationWeights` 为 **目标契约**（Jobs 页当前权重应随 compile 一并提交，供 compute 端计算并返回分项；若尚未传入，compute 使用默认权重，GUI 仍可用返回的分项按本地权重重算 Total）。

#### `componentBundle` 每项字段（发给 Modal 前由 `toCompileComponentBundle` 裁剪）

| 字段 | 含义 |
|------|------|
| `syntax` | 组件类型名（小写、消毒后），如 `mixer` |
| `name` | 显示名 |
| `source` | `default` / `tmp` / `custom` |
| `sourceType` | 来源类型 |
| `params` | 用户在 Library DIY 中修改的数值参数 |
| `jsonScript` | 完整 3DuF/ParchMint JSON 字符串 |
| `lfrScript` | 组件 LFR 模块文本（LFR import 用） |
| `mintScript` | 组件 MINT 片段 |

Express `proxyCompile` 会补充：

| 字段 | 来源 |
|------|------|
| `sourceContent` | 从 `Data/` 读出当前源文件全文 |
| `configContent` | 可选配置文件全文 |
| `componentBundle` | server 列表与 client 列表 merge（**client 按 syntax 覆盖**） |

### 4.2 Express → Modal

`POST {NEPTUNE_COMPILE_URL}/api/v1/mushroommapper`（`.lfr` / `.v`）  
或 `POST {NEPTUNE_COMPILE_URL}/api/v1/fluigi`（`.mint` / `.uf`）

请求体为上述 enriched body。响应为 **job UUID 字符串**（纯文本 JSON）。

### 4.3 Modal 内部处理

1. `write_component_bundle()` 写入临时目录：
   - `3DuF_component/default/JSON/*.json`
   - `LFR/*.lfr`、`MINT/*.mint`
2. `ensure_primitives_server()`（容器级复用）
3. 执行 fluigi：
   ```bash
   fluigi synthesize -o <out> <source> \
     --component-library <tmp>/JSON \
     --pre-load <tmp>/LFR          # 仅 LFR
   ```
4. 收集 `output/` 下文件（含 `*_fromLFR_PR.json` 或 `*_fromMINT_PR.json`）
5. 对主输出 JSON 调用 `compute_layout_evaluation_scores()`，得到评估分项
6. **删除本 job 的临时目录**；job 元数据保留在 `job_store` 直至 Express 拉取并落盘

### 4.4 Modal → Express → 持久化（目标行为）

Compute job 完成后的 `GET /api/v1/job?id=<uuid>` 响应约定：

```json
{
  "status": "done",
  "returncode": 0,
  "stdout": "...",
  "stderr": "...",
  "workspaceId": "<发起 compile 的 workspace>",
  "sourceFilename": "design.lfr",
  "outputFiles": [
    {
      "fileId": "<写入 Data/ 后的文件 id>",
      "filename": "design_fromLFR_PR.json",
      "workspaceId": "<workspace _id>",
      "workspaceName": "My Workspace"
    }
  ],
  "evaluation": {
    "areaScore": 0.646,
    "compactScore": 0.314,
    "connectionLengthScore": 0.833,
    "bendScore": 0.407,
    "symmetryScore": 0.25,
    "fragmentationScore": 1.0,
    "overallScore": 0.52,
    "weightsUsed": {
      "area": 0.2,
      "compact": 0.2,
      "connectionLength": 0.2,
      "bend": 0.2,
      "symmetry": 0.1,
      "fragmentation": 0.1
    }
  },
  "componentCount": 9,
  "primitivesReused": true
}
```

Express 在 job 成功后应：

1. 将 `*_PR.json` 等内容 **写入对应 workspace**（`Data/Temp/<session>/` 或 `Data/Users/<user>/`）；
2. 在会话的 **jobs 索引** 中记录 job 元数据（含 `workspaceId`、`files`、`evaluation`）；
3. 通知前端轮询或 WebSocket 完成；
4. 请求 Modal **删除或标记 job 临时存储**（`job_store` 条目可在拉取后 TTL 过期）。

失败时 `status: "error"`，`stderr` 含 fluigi 日志片段。

### 4.5 轮询 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/jobs` | 当前会话的 job id 列表 |
| `GET` | `/api/v1/job?id=<uuid>` | 单 job 详情（**查询参数名为 `id`**） |

---

## 5. Jobs 界面（Solutions）行为约定

路径：Dashboard → **Results / Jobs**（`Solutions.vue`）。

### 5.1 表格列（在现有评估列基础上）

| 列 | 说明 |
|----|------|
| Input File | 源 LFR/MINT 文件名 |
| Last Updated | job 完成时间 |
| Output File | 主输出 JSON 名（优先 `*_PR.json`） |
| **Workspace** | 生成 JSON 所在 workspace 名称（可点击跳转 Dashboard 该 workspace） |
| Global Util. … Total | 六项分项 + 加权总分（见下） |
| **JSON** | 按钮打开弹窗（见下） |
| Action | 状态：Done / Ongoing / Fail |

### 5.2 JSON 弹窗

点击 **View JSON** 后：

- 上方：格式化 JSON 文本（只读或可滚动）
- 下方按钮：
  - **Download** — 下载当前 JSON 文件
  - **Import to Component Library** — 作为 custom 组件导入
  - **Open in 3DuF** — 打开 [v2.3duf.org](https://v2.3duf.org/) 并加载该 JSON（需使用 routed `*_PR.json`）
  - **Delete** — 从 workspace 删除该输出文件，并更新 jobs 列表

### 5.3 Evaluation Score 与权重重算

- **分项**（Global Utilization、Local Compactness、Connection Length、Bend、Symmetry、Fragmentation）以 **后端返回的 `evaluation` 对象为准**，存于 job 记录，不随前端刷新丢失。
- **Total（加权总分）** 公式：

  ```
  Total = w_area×GlobalUtil + w_compact×LocalCompact + w_conn×ConnLength
        + w_bend×Bend + w_sym×Symmetry + w_frag×Fragmentation
  ```

- 用户在页顶修改 `w_*` 并点击 **Apply** 后：
  - **不重新请求后端**；
  - 使用各行已缓存的分项，用 **新权重** 重算所有行的 **Total**；
  - 示例行（dx2/dx3）与真实 job 行均参与重算。

评估定义见：`docs/EVALUATION_METRIC_SPEC_V1.md`；实现见 Neptune_2026 `fluigi/evaluation_metric.py`。

---

## 6. 环境变量速查

| 变量 | 设置位置 | 含义 |
|------|----------|------|
| `NEPTUNE_COMPILE_URL` | Fly secret | Modal API 根 URL，无尾斜杠 |
| `NEPTUNE_SEED_DATA_ROOT` | 可选 | 默认 `/app/seed-data` |
| `NEPTUNE_2026_ROOT` | Express 可选 | 本地 evaluation 代理用 Neptune 路径 |
| `PRIMITIVE_SERVER_URI` | Modal 容器内自动 | `http://localhost:6060` |
| `PORT` | Fly `8080` | Express 监听端口 |

---

## 7. 常见问题

| 现象 | 处理 |
|------|------|
| Component Library 为空 | 确认镜像含 `seed-data/`；拉取含 `dataLayer.js` 回退逻辑的代码并 redeploy |
| Compile 501 | 未设置 `NEPTUNE_COMPILE_URL` |
| Compile 502 | Modal 未部署或 URL 错误 |
| 组件尺寸/端子错误 | Neptune_2026 `component_library.py` 未 push；Modal 镜像需重建 |
| `Could not pull default values` | compute 容器内 primitives 未就绪；查 Modal 日志 `primitivesReused` |
| Jobs 列表为空 | 检查 `/api/v1/jobs` 是否返回会话 job 列表；job 查询参数须为 `id=` |

---

## 8. 发布检查清单

- [ ] Neptune_2026 `component_library.py` 已 push
- [ ] `modal deploy modal_app.py` 成功
- [ ] Fly `NEPTUNE_COMPILE_URL` 指向最新 Modal URL
- [ ] `fly deploy` 后日志显示 9 个默认组件
- [ ] Editor Compile 返回 job id，Jobs 页出现新行
- [ ] 输出 JSON 落在正确 workspace，评估分项与 Total 显示正常
- [ ] 修改权重 Apply 后 Total 列全部更新

---

## 9. 相关文件

| 文件 | 说明 |
|------|------|
| `modal_app.py` | Compute、primitives 复用、fluigi 调用 |
| `server/index.js` | compile 代理、evaluation 代理 |
| `server/componentBundle.js` | bundle merge / 裁剪 |
| `server/dataLayer.js` | Data 卷 + seed-data 回退 |
| `src/views/dashboard/Editor.vue` | Compile 按钮 |
| `src/views/dashboard/Solutions.vue` | Jobs 与评估权重 UI |
| `fly.toml` | Fly 卷与端口 |
| `Neptune_2026/fluigi/evaluation_metric.py` | 评估算法 |

---

*文档版本：2026-07。与代码不一致时以仓库最新实现为准；带「目标契约」的小节为前后端联调约定，部署时请与开发确认已完成项。*
