# Write LFR with the prompt package (short version)

This guide is for first-time users:

**Download the prompt package → generate LFR with an external LLM → paste it back into Neptune Editor.**

Chinese original (internal notes): `ignore/prompt中文版.md`. Longer guides: `src/Prompt/START_HERE.md` and `src/Prompt/USER_GUIDE.md`.

---

## One term first

- **BYOK = Bring Your Own Key**
  You create an API key on the model platform (OpenAI / Claude / Gemini / DashScope / DeepSeek, etc.) and use it there. Neptune does not host your key for this workflow.

---

## What you download

In Neptune Editor → **LLM prompts**, export the package for your model:

| Model | File you get |
|-------|----------------|
| Claude, GPT, Gemini | `.zip` prompt package |
| **Qwen, DeepSeek** | single `.md` prompt package (those chats do not accept zip) |

A zip (or the embedded sections of the `.md`) usually contains:

- `en2lfr_system.txt`: system prompt (tells the model to emit LFR)
- `en2lfr_user_template.txt`: example phrasing only — you do **not** need to edit it
- `lfr2en_system.txt`, `lfr2en_user_template.txt`: optional, for explaining LFR back to English
- `manifest.json`: model / API hints (for developers)

You mainly need `en2lfr_system.txt` (or the English→LFR section of the `.md`).

---

## 5 steps to generate LFR once

### 1) Download the package

In the Neptune Editor sidebar, open **LLM prompts**, pick your model, and export the pack (`.zip` or `.md` as above). Unzip if you received a zip.

### 2) Open an external model chat

ChatGPT, Claude, Gemini, Qwen, or DeepSeek — any one is fine.

### 3) Load the instructions

- Put `en2lfr_system.txt` in the **system / developer / custom instructions** field (if the UI has no such field, send it as the first message).
- For Qwen / DeepSeek: upload the `.md` if the chat allows it, or paste the **English → LFR** system section into the system prompt.
- Do **not** fill placeholders in `en2lfr_user_template.txt`. Write your requirement in the chat.

### 4) Describe the chip / device and generate

Be specific about:

- input / output ports
- mixing, splitting, control logic
- timing constraints, layer info, naming rules

You can add: **“Output only valid LFR in one ` ```lfr ` fence.”**

### 5) Paste back into Neptune Editor

Copy the LFR from the model reply into Neptune Editor, set script language to **LFR**, then save / compile.

---

## If generation fails (most useful fixes)

- Compile error: send the error plus the current LFR snippet and ask for a **minimal** fix only.
- Extra chatter around the fence: keep only the LFR inside the ` ```lfr ` block.
- Edits keep getting worse: go back to the last working version and change one thing at a time.

---

## One-sentence version (for a button tooltip)

**Export the prompt package → load `en2lfr_system` in an external LLM → describe the device in English → copy the LFR back into Neptune Editor and compile.**
