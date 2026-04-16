# Prompt ZIP -> LFR Quick Guide

This guide is for first-time users:
download prompt zip -> generate LFR with an external LLM -> paste back into Neptune Editor.

## What is BYOK

BYOK means Bring Your Own Key.
Create and use your API key on your model provider platform (OpenAI / Claude / Gemini / DashScope, etc.).

## What is in the prompt zip

After downloading from Neptune `LLM prompts`, the zip usually contains:

- `en2lfr_system.txt`: system prompt that enforces LFR output rules
- `en2lfr_user_template.txt`: user template where you fill your design request
- `lfr2en_system.txt`, `lfr2en_user_template.txt`: optional files for LFR explanation
- `manifest.json`: model/interface metadata

Most common files for generation are:
`en2lfr_system.txt` and `en2lfr_user_template.txt`.

## 5 steps to generate LFR

1. Download and unzip
   - In Neptune Editor sidebar, click `LLM prompts` and unzip the downloaded file.

2. Open an external model UI
   - Use ChatGPT / Claude / Gemini / DashScope, or any compatible model interface.

3. Provide prompts
   - Put `en2lfr_system.txt` in the system/developer area if available.
   - Copy `en2lfr_user_template.txt`, then replace placeholders with your real requirements.

4. Describe requirements and generate
   - Be explicit about ports, mixing/splitting logic, control logic, timing constraints, layers, and naming.
   - Add this instruction: "Output only LFR code, no Markdown code fences."

5. Paste back into Neptune Editor
   - Paste generated LFR into Editor, set script language to `LFR`, then save/compile.

## If generation fails

- Compile error: give the model both the error and the current LFR snippet, ask for minimal edits only.
- Output contains fenced code: remove triple backticks, keep pure LFR text only.
- Too many unstable edits: roll back to the last working version and change one thing at a time.
