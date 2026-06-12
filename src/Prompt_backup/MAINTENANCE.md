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
3. Benchmark-aligned generation rules:
   - preserve interface counts and widths,
   - drive all outputs,
   - gate staged writes with `distribute@(ctrl)` and `<=` inside branches,
   - keep N-bit routing case coverage consistent,
   - prefer explicit intermediate flow nodes.
4. Final self-check before responding.

For all `*/lfr2en_system.txt` files:
- Do not invent ports/signals/behavior.
- Keep structured explanation sections.

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
- `Prompt/<provider>/en2lfr_user_template.txt`: user template (`{{ENGLISH_SPEC}}`).
- `Prompt/<provider>/lfr2en_system.txt`: LFR -> English explanation rules.
- `Prompt/<provider>/lfr2en_user_template.txt`: user template (`{{LFR_SOURCE}}`).

## Versioning notes
- Treat benchmark-aligned blocks as "shared contract".
- When updating benchmark behavior, update all five providers in one commit.
- Record major prompt policy changes in commit message or release note.
