# LFR Readable Spec Location

The canonical human-readable LFR syntax spec is maintained in:

- `Neptune_2026/docs/LFR_READABLE_SYNTAX_SPEC_V2.md`

Reason:

- LFR parser/compiler source of truth lives in `Neptune_2026` (`pylfr/lfrX.g4`,
  preprocessor, and compile pipeline).
- Keeping one canonical spec avoids doc drift between GUI and compiler repos.

GUI docs should link to the canonical spec instead of duplicating syntax rules.

