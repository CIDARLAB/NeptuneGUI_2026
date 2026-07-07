# Neptune Prompt Package — User Guide

Use this package with **your own LLM account** (ChatGPT, Claude, Gemini, Qwen, DeepSeek).
Neptune does **not** host or require your API key for this workflow.

See **`START_HERE.md`** for the shortest path. This guide adds detail.

## 1. What the package contains

Five provider folders (`openai`, `anthropic`, `google_gemini`, `alibaba_qwen`, `deepseek`). Each includes:

| File | Purpose |
|------|---------|
| `en2lfr_system.txt` | **Required** — paste into system / custom instructions |
| `lfr2en_system.txt` | Optional — explain LFR back to English |
| `en2lfr_user_template.txt` | **Example only** — do not edit to use the package |
| `lfr2en_user_template.txt` | **Example only** — do not edit to use the package |
| `README.txt` | Short setup reminder for that provider |
| `manifest.json` | For developers (env var names, default model) |

Shared reference (optional, improves quality):

- `LFR_SYNTAX_MANUAL.txt`
- `MINT_SYNTAX_MANUAL.txt`
- `DEVELOPER_ENTRY_POINTS.txt`

## 2. One-time setup

1. Download or export the zip from Neptune GUI (Dashboard → pick a model → download prompt pack).
2. Pick **one** provider folder matching the LLM you use.
3. Copy **`en2lfr_system.txt`** into that LLM's system / custom / project instructions field.
4. Optionally attach `LFR_SYNTAX_MANUAL.txt` as knowledge or project file.

You do **not** need to edit any template file or replace placeholders like `{{ENGLISH_SPEC}}`.

## 3. Daily use — English → LFR

1. Open a chat with the configured assistant.
2. Write your **design requirement in plain English** in the message.
3. The model returns **one** ` ```lfr ` fenced block.
4. Copy that block into Neptune GUI → **Editor** → set language **LFR** → **Save** → **Compile**.

Example message:

```text
I need a module with fluid inputs a and b, control sel, and output y.
When sel is 0, route a to y; when sel is 1, route b to y.
```

If compile fails, paste the compiler error into the same chat and ask for a corrected LFR block.

## 4. Optional — LFR → English

1. Use **`lfr2en_system.txt`** as instructions (new chat or swap instructions).
2. Paste your **full LFR source** directly in the message.
3. You do **not** need to edit `lfr2en_user_template.txt`.

## 5. Provider-specific setup

| Provider | Where to paste `en2lfr_system.txt` |
|----------|-------------------------------------|
| **ChatGPT** | Custom GPT or Project → Instructions |
| **Claude** | Project → Custom Instructions |
| **Gemini** | Gem or system instruction field |
| **Qwen** | Chat or DashScope API system prompt |
| **DeepSeek** | Chat or API system prompt |

Billing and API keys are on **your** provider account (BYOK). Neptune only ships the prompt text.

## 6. Token cost (if using API)

Most providers charge by token (input + output). Typical drivers of cost:

- Length of your English requirement and any follow-up fixes
- Size of attached syntax manuals
- Model tier you choose

Check your provider's pricing page for current rates.

## 7. Security

- Do not commit API keys to git or share them in screenshots.
- Rotate keys if you suspect leakage.
- The prompt package contains **no** secrets — only instructions and reference text.

## 8. FAQ

**Do I edit `en2lfr_user_template.txt`?**  
No. Write your requirement directly in chat.

**The model asked me to fill in `{{ENGLISH_SPEC}}`.**  
Re-paste `en2lfr_system.txt` into instructions; it tells the model to treat your chat message as the spec.

**Can I use a different model than the folder name?**  
Yes. Pick any folder whose system prompt fits your UI; core LFR rules are aligned across all five.

**Where is Neptune's in-app API key UI?**  
This open-source GUI exports the pack for external LLM use. There is no built-in key field — upload the pack to your LLM instead.
