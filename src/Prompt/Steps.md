# Using Neptune prompt files to write LFR code

This guide explains how the plain-text files in each model folder under `src/Prompt` help **you** drive a chat LLM (Qwen, DeepSeek, Gemini, GPT, Claude) so it produces **valid LFR** for Neptune’s Editor.

---

## English → LFR (BYOK) — suggested user steps

This is a generic **bring-your-own-key (BYOK)** path: describe the design in **English**, obtain **LFR**, and keep work split between **what you do in the cloud console** and **what you do in Neptune** (features differ by deployment).

### 1. Cloud account

Register on the platform you will use (e.g. Alibaba Cloud DashScope / Model Studio, OpenAI, Anthropic, Google AI—whichever you choose) and complete any required verification.

### 2. Models and billing

In that console, enable the **chat** and/or **code** models you need. Add **billing** or use **trial credits** as described there.

### 3. API key

Create an **API key** in the console, copy it, and store it securely. Do not share it or post it in public channels.

### 4. Open Neptune

Go to your Neptune site. If your deployment offers **“API / model settings”** (names vary), you may **select a provider → paste the key → save**; if **“test connection”** exists, run it once to confirm connectivity.

> **NeptuneGUI_2026 (this repo)**  
> The open-source UI **may not** include in-app cloud key binding or a one-click **Generate LFR** entry. If those menus are missing, keep using the key in the **vendor console / official chat / API tools**. In this GUI, use the **Editor** sidebar **“LLM prompts”**: download that model’s **prompt zip**, follow **Recommended workflow** below with an external chat, then **paste** the generated LFR back into the **Editor**. In-app guide: route **`/prompt/steps`** (`PromptSteps`).

### 5. Write your request in English

Use any **English → LFR** entry your product provides and describe the design (inlets, outlets, mixing, control, etc.).  
If you only have the **Editor**, use an external LLM from the sidebar as above and describe the same in the chat.

### 6. Generate LFR

- **If the product offers “Generate LFR”**: choose a model if offered → click **Generate LFR** → wait for completion.  
- **If you use an external chat**: configure **`en2lfr_*.txt`** from the zip as system/user prompts, ask for **LFR only**, then copy into Neptune’s **Editor**.

### 7. Review results

Read the generated LFR. If the UI shows **compile output**, decide whether to **refine the description and retry** or **edit the code** based on pass/fail. When connecting to Neptune_2026 locally, see **RUN_LFR.md** at the NeptuneGUI_2026 repo root (next to `package.json`) for compile and Data folder notes.

### 8. Export

Use **copy** or **download** as your UI provides (this GUI’s Editor includes **Download** and related save actions).

### 9. Fees and privacy

Usage and billing appear in the **cloud vendor’s console**. Requests and responses are governed by **that vendor’s** privacy policy. If Neptune ever stored a key, remove it in **settings** when you no longer need it (if that feature exists).

---

## What you downloaded

The `.zip` from the Neptune GUI contains:

- **`manifest.json`** — Notes for that provider (API env vars, suggested base URL, default model name). You bring your own API key where applicable.
- **`en2lfr_system.txt`** — System prompt for **English description → LFR script**.
- **`en2lfr_user_template.txt`** — User message template for the same direction (fill in your request).
- **`lfr2en_system.txt`** / **`lfr2en_user_template.txt`** — Optional: explain or translate existing LFR into English.

Treat these files as **prompt scripts**: you copy their contents into the LLM UI according to the product’s rules (custom instructions, project knowledge, or pasted messages).

## Recommended workflow (this GUI + external chat)

1. **Unzip** the package and open the `.txt` files in a text editor.
2. **Open** the vendor’s chat or agent page (use the “Open … chat” button in Neptune if you like).
3. **Load the prompts** (pick one pattern):
   - **Custom instructions / system prompt** (ChatGPT, Claude, Gemini, etc.): paste **`en2lfr_system.txt`** into the system or developer field. If there is a separate “user template” area, paste **`en2lfr_user_template.txt`** there or keep it ready to paste per message.
   - **Per-turn chat**: start a new conversation, paste **`en2lfr_system.txt`** as the first message and ask the model to follow it for the rest of the session; then use **`en2lfr_user_template.txt`** and replace placeholders with your actual request.
4. **Describe your device in English** — inputs/outputs, layers, mixing, timing, ports, and any constraints. Ask explicitly for **LFR only** (or LFR plus a short explanation if you need it), matching the tone in the templates.
5. **Copy the LFR** from the reply and **paste it into Neptune’s Editor**. Set **Script language** to LFR and save/compile as usual (see **RUN_LFR.md** at the NeptuneGUI_2026 repo root when wiring the compile backend).
6. **Iterate**: if the model drifts, paste a snippet of your current LFR and ask for a minimal fix, or use **`lfr2en_*`** files so the model explains what a block does before you change it.

## Tips

- Keep **one role per file**: system text stays stable; your concrete ask goes in the user template or follow-up messages.
- If the model outputs Markdown fences (```` ```lfr ````), strip the fences and keep only the LFR source.
- Cross-check **port names** and **`module` / `endmodule`** structure against Neptune’s examples and your workspace rules.

This file is bundled at the root of the downloaded `.zip` as **`Steps.md`** so you can read it offline next to the prompt scripts.
