# Prompt Package User Guide (English)

This guide is for end users: after downloading `Prompt/`, how to connect to an LLM provider, how token billing works, and how to generate LFR code from your web UI in a few clicks.

## 1. What this Prompt Package contains

`Prompt/` includes 5 provider packs (OpenAI / Claude / Gemini / Qwen / DeepSeek). Each pack contains:

- `manifest.json`: provider integration info (API key env var, suggested base URL, default model)
- `en2lfr_system.txt`: system prompt for English spec -> LFR code
- `en2lfr_user_template.txt`: user template (`{{ENGLISH_SPEC}}`)
- `lfr2en_system.txt`: system prompt for LFR -> English explanation
- `lfr2en_user_template.txt`: user template (`{{LFR_SOURCE}}`)

`buttons.json` maps web buttons to these provider folders.

## 2. What users need first

1. Choose one provider (Qwen/OpenAI/Anthropic/Gemini/DeepSeek).
2. Enable API access on that provider and create an API key.
3. Add funds (or use free trial credits) so your account has available token balance.
4. Paste your key in Neptune web UI under "Model Settings" or "API Settings".

> This is BYOK (Bring Your Own Key): billing is charged directly to the user's own provider account.

## 3. How token payment works (general)

Most providers bill by token:

- Input tokens: your request content (system prompt + user input + optional history)
- Output tokens: model response content (mostly LFR code in this workflow)

Typical cost = input token cost + output token cost (usually priced per 1M tokens).

Billing appears in each provider console, not in Neptune itself.

## 4. Provider setup and payment steps (user view)

Names and UI labels may change over time; follow your provider dashboard.

### A) Alibaba Qwen (DashScope / Model Studio)

1. Sign in to Alibaba Cloud and enable Model Studio / DashScope.
2. Create an API key (common env var: `DASHSCOPE_API_KEY`).
3. Add credit or use trial quota if available.
4. In Neptune web UI, select Qwen, paste the key, and test connection.

Reference: <https://www.alibabacloud.com/help/en/model-studio/model-pricing>

### B) OpenAI

1. Sign in to OpenAI platform and create an API key (`OPENAI_API_KEY`).
2. Add payment method / enable usage billing.
3. In Neptune web UI, select OpenAI, paste key, and test.

Reference: <https://openai.com/api/pricing>

### C) Anthropic (Claude)

1. Sign in to Anthropic Console and create key (`ANTHROPIC_API_KEY`).
2. Enable billing under current account rules.
3. In Neptune web UI, select Claude, paste key, and test.

Reference: <https://platform.claude.com/docs/en/about-claude/pricing>

### D) Google Gemini API

1. In Google AI Studio / Gemini API, create key (`GEMINI_API_KEY`).
2. Upgrade to paid tier when free limits are not enough.
3. In Neptune web UI, select Gemini, paste key, and test.

Reference: <https://ai.google.dev/gemini-api/docs/pricing>

### E) DeepSeek

1. In DeepSeek console, create key (`DEEPSEEK_API_KEY`).
2. Top up account if free quota is insufficient.
3. In Neptune web UI, select DeepSeek, paste key, and test.

Reference: <https://api-docs.deepseek.com/quick_start/pricing>

## 5. Standard flow to generate LFR in Neptune web UI

1. Open the web app and go to "Model Settings".
2. Click one provider button (OpenAI/Claude/Gemini/Qwen/DeepSeek).
3. Paste your API key and click "Test Connection".
4. Enter your design request in English (inputs/outputs/control logic/split/mix behavior).
5. Click "Generate LFR".
6. Review generated LFR and compile status (if compile validation is enabled).
7. If failed, revise the request based on error hints and retry.

## 6. Practical tips to reduce token cost

- Keep requirements structured and specific to reduce retries.
- Avoid pasting unrelated long text into the input box.
- Use a lower-cost model for draft attempts; switch to stronger model for hard cases.
- Enable caching/batch options if the provider supports them.

## 7. Security tips (important)

- Only enter API keys in trusted web apps/backends.
- Never commit keys to git, screenshots, or public issues.
- Rotate keys periodically; revoke immediately if leakage is suspected.

## 8. FAQ

### Q1: I clicked generate but got no result. What should I check?
Check key validity, account balance/quota, model availability, and network connectivity.

### Q2: Why did my cost spike?
Multiple retries, long prompts, and long outputs all increase token usage.

### Q3: Can different models share one prompt strategy?
Yes. Keep core rules aligned, while allowing small provider-specific variations (see `Prompt/MAINTENANCE.md`).
