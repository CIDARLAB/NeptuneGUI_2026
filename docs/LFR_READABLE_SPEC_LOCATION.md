# LFR Readable Spec Location

The canonical human-readable LFR syntax spec is maintained in:

- `Neptune_2026/docs/LFR_READABLE_SYNTAX_SPEC_V2.md`
- Combined LFR + MINT manual: `Neptune_2026/docs/LFR_MINT_LANGUAGE_MANUAL.md`
- Mixer `#MAP` vs `#CONSTRAIN` table: `Neptune_2026/docs/LFR-TestCases-wiki/Compiler-Directives.md`

The GUI **References** page links to those files on GitHub. Binary `+` already maps to MIXER (no `#MAP`). `#CONSTRAIN` writes mixer geometry on the next matching assign. `#MAP "MIXER" "~"` is only for unary `~`.

Reason:

- LFR parser/compiler source of truth lives in `Neptune_2026` (`pylfr/lfrX.g4`,
  preprocessor, and compile pipeline).
- Keeping one canonical spec avoids doc drift between GUI and compiler repos.

GUI docs should link to the canonical spec instead of duplicating syntax rules.

