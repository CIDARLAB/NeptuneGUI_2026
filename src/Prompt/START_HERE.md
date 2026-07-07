# Neptune Prompt Package — Start Here

Use this package with **your own LLM account** (ChatGPT, Claude, Gemini, Qwen, DeepSeek, etc.).
Neptune does **not** need your API key for this workflow.

## What you do (no file editing required)

1. Pick **one** provider folder (`openai`, `anthropic`, `google_gemini`, `alibaba_qwen`, or `deepseek`).
2. Upload the package files to your LLM (see provider tips below).
3. Set **`en2lfr_system.txt`** as the assistant / custom / system instructions.
4. Start a chat and **write your design requirement in plain English** — that is all.
5. Copy the generated ` ```lfr ` block into Neptune Editor and compile.

You do **not** need to open `en2lfr_user_template.txt` or replace `{{ENGLISH_SPEC}}`.
Those files are **optional examples only**.

## English requirement → LFR (main workflow)

In chat, describe your device in English, for example:

```text
I need a module with fluid inputs a and b, control sel, and output y.
When sel is 0, route a to y; when sel is 1, route b to y.
```

The model should return **one** fenced LFR block and nothing else.

## LFR → English explanation (optional)

1. Set **`lfr2en_system.txt`** as instructions (or start a new chat with it).
2. Paste your **full LFR source** directly in the message.
3. You do **not** need to edit `lfr2en_user_template.txt`.

## What to upload (recommended minimum)

Per provider folder:

- `en2lfr_system.txt` — **required** (instructions)
- `lfr2en_system.txt` — optional (explain LFR back to English)

Shared reference files (help quality, not required):

- `LFR_SYNTAX_MANUAL.txt`
- `MINT_SYNTAX_MANUAL.txt`

## Provider upload tips

| Provider | Typical setup |
|----------|----------------|
| **ChatGPT** | Custom GPT or Project: paste `en2lfr_system.txt` into Instructions; upload syntax manuals to Knowledge if supported |
| **Claude** | Project: Custom Instructions = `en2lfr_system.txt`; add manuals as project files |
| **Gemini** | Gem or system instruction field: paste `en2lfr_system.txt` |
| **Qwen / DashScope** | System prompt field in chat or API: paste `en2lfr_system.txt` |
| **DeepSeek** | System prompt in chat or API: paste `en2lfr_system.txt` |

Then chat normally — **your message is the requirement**.

## Files you can ignore

- `en2lfr_user_template.txt` / `lfr2en_user_template.txt` — example phrasing only
- `manifest.json` — for developers integrating APIs (env var names, default model)
- `MAINTENANCE.md` — for Neptune maintainers

## After generation

1. Open Neptune GUI → **Editor**
2. Paste LFR, set language to **LFR**, **Save**, **Compile**
3. If compile fails, paste the error back into the same chat and ask for a fixed LFR

## Security

- Do not commit API keys to git.
- Billing is on **your** LLM provider account (BYOK).
