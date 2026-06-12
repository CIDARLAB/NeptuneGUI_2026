# Prompt Package API Key 获取与冒烟测试清单

本文用于 NeptuneGUI 的 `Prompt` 多模型包联调，目标是快速验证：

1. 英语需求是否可稳定转换为 LFR（en2lfr）
2. 指定 LFR 是否可被准确反向解释（lfr2en）

---

## 1) 各 Provider API Key 获取入口

> 建议先准备 1~2 个 provider 完成验证，再扩展到全部 provider。

- OpenAI (`OPENAI_API_KEY`)
  - 控制台: <https://platform.openai.com/api-keys>
- Anthropic (`ANTHROPIC_API_KEY`)
  - 控制台: <https://console.anthropic.com/settings/keys>
- Google Gemini (`GEMINI_API_KEY`)
  - 控制台: <https://aistudio.google.com/app/apikey>
- Alibaba Qwen / DashScope (`DASHSCOPE_API_KEY`)
  - 控制台: <https://dashscope.console.aliyun.com/>
- DeepSeek (`DEEPSEEK_API_KEY`)
  - 控制台: <https://platform.deepseek.com/api_keys>

### 通用开通步骤

1. 注册/登录 provider 平台。
2. 开通 API 服务（有些平台需要单独启用模型服务）。
3. 创建 API Key（通常只展示一次，立即复制保存）。
4. 确认账户余额/免费额度/计费配置已可用。
5. 在 Neptune GUI 的模型设置中粘贴 Key 并测试连接。

---

## 2) Neptune 内配置建议

在 Neptune GUI 中，对每个 provider 建议配置：

1. 选择对应 provider。
2. 粘贴 API Key。
3. 若 UI 支持自定义 base URL/model，优先使用 `src/Prompt/<provider>/manifest.json` 中建议值。
4. 点击连接测试（或首次调用时观察返回是否为认证/配额错误）。

常见错误定位：

- 401/403: Key 无效、权限不足、账号未开通对应模型。
- 429: 配额不足或速率限制。
- 5xx: provider 服务波动，稍后重试。

---

## 3) 冒烟测试（每个 Provider 约 2~5 分钟）

每个 provider 做 2 个最小测试：`en2lfr` + `lfr2en`。

### A. en2lfr 测试（英语需求 -> LFR）

将以下英文需求输入到 en2lfr 流程中：

```text
Design a module with two fluid inputs a and b, one control signal sel, and one output y.
When sel is 0, route a to y.
When sel is 1, route b to y.
Output only valid LFR.
```

验收标准：

1. 返回仅包含一个 ` ```lfr ` 代码块（无额外解释文本）。
2. 端口与需求一致（`a`, `b`, `sel`, `y`）。
3. 控制逻辑和分支语义正确（sel=0 走 a，sel=1 走 b）。
4. 无明显语法错误（可通过编译/解析）。
5. 未虚构额外外部端口或控制信号。

### B. lfr2en 测试（LFR -> 英文解释）

将以下 LFR 输入到 lfr2en 流程中：

```text
module mux2(finput a, b; control sel; foutput y;);
flow tmp;
distribute@(sel) begin
  if (sel == 1'b0) begin
    tmp <= a;
  end else begin
    tmp <= b;
  end
end
assign y = tmp;
endmodule
```

验收标准：

1. 输出为纯文本（无代码块）。
2. 使用四个固定标题：
   - `Module interface:`
   - `Internal state:`
   - `Behavior:`
   - `Mapping/constraints:`
3. 解释与输入 LFR 一致，不杜撰不存在的端口、约束、行为。
4. 若无 `#MAP/#CONSTRAIN`，应明确写 `None.`。

---

## 4) 回归建议（全量 provider）

建议对 5 家 provider 做同一组最小回归并记录结果：

- OpenAI
- Anthropic (Claude)
- Google Gemini
- Alibaba Qwen
- DeepSeek

记录项：

1. 是否成功调用（认证、配额、网络）
2. en2lfr 是否通过验收 1~5
3. lfr2en 是否通过验收 1~4
4. 是否出现明显 provider 特有偏差（如额外解释文本、标题不一致）

---

## 5) 安全与运维注意事项

1. API Key 不要提交到 Git（包括 `.env`）。
2. 不要在 issue、截图、聊天中泄露 Key。
3. 建议按 provider 分环境（dev/test/prod）管理 key。
4. 若怀疑泄露，立即吊销并重新生成。

