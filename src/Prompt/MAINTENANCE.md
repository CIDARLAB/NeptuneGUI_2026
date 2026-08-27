# Prompt Maintenance Guide

This file defines how to maintain multi-provider prompt packs in `Prompt/`.

## Why this exists
- We support five model buttons (`openai`, `anthropic`, `google_gemini`, `alibaba_qwen`, `deepseek`).
- Small provider-specific differences are allowed and often helpful.
- Core behavior must not drift, otherwise benchmark quality and compile pass rate drop.

## What can differ across providers
- Tone and style hints (for example, "be direct", "avoid conversational wrapping").
- Provider quirks (safety wording, output verbosity control, caching hints).
- Language preference notes for mixed Chinese/English input.

## What must stay aligned across providers
For all `*/en2lfr_system.txt` files, keep these invariant blocks semantically consistent:
1. One fenced LFR-only output (no extra text, no MINT/JSON).
2. Neptune LFR grammar essentials aligned with GUI References / `LFR_READABLE_SYNTAX_SPEC_V2.md` (module/ports/declarations/assign/distribute/imports), summarized in `LFR_SYNTAX_MANUAL.txt`.
3. Module port list uses commas between finput/foutput/control groups inside `module name( ... )` — never semicolons in the header.
4. Hard syntax rules against common LLM invents — place each rule
   **next to the feature it constrains** (mix/`#MAP` together in LFR
   reference; backtick-import form inside Imports, immediately after
   How users send requests). Do not append them only at Final self-check:
   - metering uses `%` only (never `@`),
   - ports are only `finput`/`foutput`/`control` (never `cinput`),
   - control routing uses `distribute@(ctrl)` (never ternary `?:`),
   - `#MAP` is `#MAP "<TECH>" "<op>"` with both args quoted, or omitted (`~` alone is enough).
   - `#MAP` placement: inside the module body, immediately above the `assign` that uses `~` — never before `module`.
   - dialect boundaries (`finput`/`foutput`/`control` + `assign` only; no helper functions),
   - brace-split / no tautological assigns,
   - backtick-import + named `.port(net)` maps when reusing modules;
     import line is only `` `import "<path>.lfr" `` (no `from`, no module name);
     reject `import Name from "…"` and `` `import Name from "…" ``.
   - ordinary mix uses binary `+` only; do not default to `~(a+b)` /
     `#MAP "MIXER" "~"` unless English asks for a named technology / unary process.
5. Benchmark-aligned generation rules:
   - preserve interface counts and widths,
   - drive all outputs,
   - gate staged writes with `distribute@(ctrl)` and `<=` inside branches,
   - keep N-bit routing case coverage consistent,
   - prefer explicit intermediate flow nodes.
6. Final self-check before responding.

For all `*/lfr2en_system.txt` files:
- Do not invent ports/signals/behavior.
- Keep structured explanation sections.
- Tell the model: user pastes LFR in chat; do not ask to edit `lfr2en_user_template.txt`.

Upload-and-use workflow (all providers):
- Users upload the package to their LLM and send requirements in chat.
- `en2lfr_user_template.txt` / `lfr2en_user_template.txt` are **optional examples only** (no `{{ENGLISH_SPEC}}` / `{{LFR_SOURCE}}` workflow).
- `START_HERE.md` and `USER_GUIDE.md` describe end-user steps; keep them aligned with system prompts.
- Each `*/README.txt` is a one-screen provider setup reminder.

## Update workflow (recommended)
1. Edit one provider first (usually `openai/en2lfr_system.txt`) as reference.
2. Propagate invariant rule updates to the other four providers.
3. Keep provider-specific notes intact.
4. **In the same edit pass**, keep these three locations aligned (source of truth: `Neptune_2026/Prompt/`):
   - `Neptune_2026/Prompt/`
   - `NeptuneGUI_2026/src/Prompt/`
   - `Quick_Examples/prompt_test/prompt_packages/` exported packs (`.zip` for Claude/GPT/Gemini, `.md` for Qwen/DeepSeek)
5. Smoke-test with at least these cases:
   - fan-out from one storage to multiple outputs,
   - N-bit demux routing with case branches,
   - staged control-gated storage loading,
   - multi-stage aggregation pipeline,
   - droplet metering with `%` (reject `@`),
   - control mux via `distribute` (reject ternary/`cinput`),
   - ordinary mix via `+` only; reject decorative `~(a+b)` / invented `#MAP "MIXER" "~"`.
   - when `#MAP` is required: quoted form + body placement (reject `#MAP flow MIXER`, file-top `#MAP`).
   - brace-split (`{a,b} = s / 2`) and reject `assign a, b = ...` / `assign x = x`.
   - backtick-import path-only lines; reject bare `import`, `import Name from`, and hierarchical `u.port=`.
   - dialect boundaries: reject `fluid`/`output fluid` and bare assignments.
6. If one provider underperforms, add only a thin provider patch; do not fork core rules.

## File map
- `Prompt/buttons.json`: button-to-folder mapping used by UI.
- `Prompt/<provider>/manifest.json`: key env var, base URL, default model.
- `Prompt/<provider>/en2lfr_system.txt`: English spec -> LFR generation rules.
- `Prompt/<provider>/en2lfr_user_template.txt`: optional example user message (not a form).
- `Prompt/<provider>/lfr2en_system.txt`: LFR -> English explanation rules.
- `Prompt/<provider>/lfr2en_user_template.txt`: optional example (paste LFR in chat).
- `Prompt/<provider>/README.txt`: short provider setup note for GUI exports.
- `Prompt/START_HERE.md`: primary end-user entry (upload → chat → LFR).
- `Prompt/USER_GUIDE.md`: extended user guide (BYOK, providers, FAQ).
- `Prompt/LFR_SYNTAX_MANUAL.txt`: quick LFR reference bundled in GUI exports.
- `Prompt/MINT_SYNTAX_MANUAL.txt`: quick MINT reference bundled in GUI exports.
- `Prompt/DEVELOPER_ENTRY_POINTS.txt`: developer/wiki entry-point index for GUI exports.

## GUI export formats (NeptuneGUI Editor → LLM prompts)
- **Claude / GPT / Gemini** (`anthropic`, `openai`, `google_gemini`): export a **`.zip`** of the provider folder + shared manuals.
- **Qwen / DeepSeek** (`alibaba_qwen`, `deepseek`): export a single **`.md`** file that embeds the same pack (those chat UIs do not accept `.zip`).
- Source of truth remains the per-file tree under `Prompt/`; the GUI builds zip/md on download. Keep `README.txt` for qwen/deepseek describing the `.md` export.

## Wiki/docs sync checklist
When Neptune docs or compiler behavior changes, update prompt package in the same pass:
1. `docs/LFR_READABLE_SYNTAX_SPEC_V2.md` and/or `docs/LFR_MINT_LANGUAGE_MANUAL.md` (GUI References links here)
2. `docs/LFR-TestCases-wiki/` and/or `docs/MINT-TestCases-wiki/` companion pages
3. `Prompt/LFR_SYNTAX_MANUAL.txt` and `Prompt/MINT_SYNTAX_MANUAL.txt` (distill References/V2 for LLM packs)
4. Shared **LFR syntax norms** block in all five `*/en2lfr_system.txt` files
5. `Prompt/DEVELOPER_ENTRY_POINTS.txt` (wiki paths and entry points)
6. Keep `Neptune_2026/Prompt/`, `NeptuneGUI_2026/src/Prompt/`, and `Quick_Examples/prompt_test/prompt_packages/` aligned in the same edit pass

## Versioning notes
- Treat benchmark-aligned blocks as "shared contract".
- When updating benchmark behavior, update all five providers in one commit.
- Record major prompt policy changes in commit message or release note.
