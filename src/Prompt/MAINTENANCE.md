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
2. Neptune LFR grammar essentials (module/ports/declarations/assign/distribute).
3. Module port list uses commas between finput/foutput/control groups inside `module name( ... )` — never semicolons in the header.
4. Benchmark-aligned generation rules:
   - preserve interface counts and widths,
   - drive all outputs,
   - gate staged writes with `distribute@(ctrl)` and `<=` inside branches,
   - keep N-bit routing case coverage consistent,
   - prefer explicit intermediate flow nodes.
5. Final self-check before responding.

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
4. Smoke-test with at least these cases:
   - fan-out from one storage to multiple outputs,
   - N-bit demux routing with case branches,
   - staged control-gated storage loading,
   - multi-stage aggregation pipeline.
5. If one provider underperforms, add only a thin provider patch; do not fork core rules.

## File map
- `Prompt/buttons.json`: button-to-folder mapping used by UI.
- `Prompt/<provider>/manifest.json`: key env var, base URL, default model.
- `Prompt/<provider>/en2lfr_system.txt`: English spec -> LFR generation rules.
- `Prompt/<provider>/en2lfr_user_template.txt`: optional example user message (not a form).
- `Prompt/<provider>/lfr2en_system.txt`: LFR -> English explanation rules.
- `Prompt/<provider>/lfr2en_user_template.txt`: optional example (paste LFR in chat).
- `Prompt/<provider>/README.txt`: short provider setup note for zip exports.
- `Prompt/START_HERE.md`: primary end-user entry (upload → chat → LFR).
- `Prompt/USER_GUIDE.md`: extended user guide (BYOK, providers, FAQ).
- `Prompt/LFR_SYNTAX_MANUAL.txt`: quick LFR reference bundled in GUI zip exports.
- `Prompt/MINT_SYNTAX_MANUAL.txt`: quick MINT reference bundled in GUI zip exports.
- `Prompt/DEVELOPER_ENTRY_POINTS.txt`: developer/wiki entry-point index for zip exports.

## Wiki/docs sync checklist
When Neptune docs or compiler behavior changes, update prompt package in the same pass:
1. `docs/LFR_READABLE_SYNTAX_SPEC_V2.md` and/or `docs/LFR_MINT_LANGUAGE_MANUAL.md`
2. `docs/LFR-TestCases-wiki/` and/or `docs/MINT-TestCases-wiki/` companion pages
3. `Prompt/LFR_SYNTAX_MANUAL.txt` and `Prompt/MINT_SYNTAX_MANUAL.txt`
4. `Prompt/DEVELOPER_ENTRY_POINTS.txt` (wiki paths and entry points)
5. Shared invariant blocks in all five `*/en2lfr_system.txt` files
6. Keep `Neptune_2026/Prompt/` and `NeptuneGUI_2026/src/Prompt/` aligned

## Versioning notes
- Treat benchmark-aligned blocks as "shared contract".
- When updating benchmark behavior, update all five providers in one commit.
- Record major prompt policy changes in commit message or release note.
