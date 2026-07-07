# Prompt Package API Keys and Smoke Test Checklist

This document is for validating NeptuneGUI `Prompt` multi-provider packages with two core goals:

1. Verify English requirements can be converted into LFR reliably (`en2lfr`).
2. Verify a given LFR can be explained back accurately in technical English (`lfr2en`).

---

## 1) API key portals by provider

> Start with 1-2 providers for quick validation, then expand to all providers.

- OpenAI (`OPENAI_API_KEY`)
  - Console: <https://platform.openai.com/api-keys>
- Anthropic (`ANTHROPIC_API_KEY`)
  - Console: <https://console.anthropic.com/settings/keys>
- Google Gemini (`GEMINI_API_KEY`)
  - Console: <https://aistudio.google.com/app/apikey>
- Alibaba Qwen / DashScope (`DASHSCOPE_API_KEY`)
  - Console: <https://dashscope.console.aliyun.com/>
- DeepSeek (`DEEPSEEK_API_KEY`)
  - Console: <https://platform.deepseek.com/api_keys>

### Common setup steps

1. Sign in to the provider platform.
2. Enable API/model service access if required.
3. Create an API key (usually shown once; copy it immediately).
4. Confirm billing/quota/credit is active.
5. Paste the key into Neptune GUI model settings and test connectivity.

---

## 2) Neptune configuration guidance

In Neptune GUI, for each provider:

1. Select the target provider.
2. Paste the API key.
3. If the UI allows custom base URL/model, use the values suggested in `src/Prompt/<provider>/manifest.json`.
4. Run connection test (or check the first request response).

Common errors:

- 401/403: invalid key, permission issue, or model not enabled.
- 429: quota exhausted or rate limited.
- 5xx: provider-side transient issue; retry later.

---

## 3) Smoke test checklist (2-5 minutes per provider)

### Local automated pre-check (no API keys)

From `Neptune_2026` repo root:

```bash
poetry run python scripts/verify_prompt_smoke.py
```

This validates prompt-pack structure, updated distribute/MINT support-doc markers,
`lfr2en` section headers, and `compile_lfr` on checklist + new distribute patterns.

Run two minimum tests per provider: `en2lfr` + `lfr2en`.

### A. en2lfr test (English requirement -> LFR)

Use this input:

```text
Design a module with two fluid inputs a and b, one control signal sel, and one output y.
When sel is 0, route a to y.
When sel is 1, route b to y.
Output only valid LFR.
```

Acceptance criteria:

1. Output contains only one ` ```lfr ` fenced block (no extra explanation).
2. Ports match the request (`a`, `b`, `sel`, `y`).
3. Control semantics are correct (`sel=0` routes `a`, `sel=1` routes `b`).
4. No obvious syntax errors (compiles/parses cleanly).
5. No invented external ports or controls.

### B. lfr2en test (LFR -> English explanation)

Use this input:

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

Acceptance criteria:

1. Output is plain text (no code fences).
2. Output includes exactly these four headers:
   - `Module interface:`
   - `Internal state:`
   - `Behavior:`
   - `Mapping/constraints:`
3. Explanation is faithful to the given LFR (no invented ports/constraints/behavior).
4. If no `#MAP/#CONSTRAIN` exists, `Mapping/constraints` should explicitly say `None.`.

---

## 4) Full regression recommendation

Run the same smoke tests against all providers:

- OpenAI
- Anthropic (Claude)
- Google Gemini
- Alibaba Qwen
- DeepSeek

Record for each provider:

1. Invocation status (auth, quota, network).
2. Whether `en2lfr` passes criteria 1-5.
3. Whether `lfr2en` passes criteria 1-4.
4. Any provider-specific drift (extra chatter, wrong section headers, etc.).

---

## 5) Security and operations notes

1. Never commit API keys to git (including `.env`).
2. Never expose keys in issues, screenshots, or chat logs.
3. Manage keys by environment (dev/test/prod).
4. Revoke and rotate keys immediately if leakage is suspected.

