# Naming and Syntax Spec v1

This document defines naming normalization rules for Neptune component identifiers
across LFR and MINT views.

## 1) Purpose

- Keep MINT and LFR component naming visually distinct.
- Make parser behavior predictable.
- Enforce strict LFR naming for imported custom components.

## 2) Canonical Internal Form

- Neptune internal AST/JSON uses `snake_case` keys and component identifiers.
- Internal canonical component names are lowercase `snake_case`.
- Serialization rules:
  - AST -> MINT display: uppercase component identifier conversion.
  - AST -> LFR display: lowercase component identifier conversion.

## 3) Core Rules (Normative)

1. **LFR component identifiers are lowercase**
   - Component identifiers shown/entered in LFR context MUST be lowercase `snake_case`.
2. **MINT component display uses uppercase**
   - The same component identifier SHOULD be rendered in uppercase form in MINT-facing displays.
   - Example: `droplet_generator` -> `DROPLET_GENERATOR`.
3. **Multi-word syntax uses underscore**
   - Multi-word identifiers MUST use `_` separators.
4. **No spaces or hyphens in identifiers**
   - `flow_rate` is valid; `flow-rate` and `flow rate` are invalid.
5. **Identifier character set**
   - Identifiers MUST match: `^[A-Za-z][A-Za-z0-9_]*$` before normalization.
6. **Case is semantic by language mode for component identifiers**
   - The same component identifier should render as uppercase in MINT displays and lowercase in LFR displays.
7. **Numbers and units keep numeric meaning**
   - Numeric value parsing MUST preserve value.
   - Unit formatting should be normalized by the parser/formatter policy.
8. **Imported custom components must follow LFR naming**
   - Import validation for custom components MUST enforce lowercase `snake_case` names.
9. **GUI-assisted correction is optional, final naming is strict**
   - If an imported component name violates LFR naming, GUI SHOULD prompt:
     - `This component name does not follow LFR naming rules. Convert to lowercase snake_case?`
   - If user confirms, GUI auto-converts before import commit.
   - If user declines, import MUST be blocked with a clear error.
10. **Round-trip stability**
   - `MINT -> AST -> MINT` and `LFR -> AST -> LFR` should produce stable normalized text.

## 4) Normalization Pipeline

1. Parse user input.
2. Validate imported custom components against strict LFR lowercase `snake_case`.
3. If invalid, show conversion confirmation dialog.
4. Convert accepted component identifiers to canonical lowercase `snake_case` in AST.
5. Validate syntax and semantic constraints.
6. Emit component identifier text by target mode:
   - MINT-facing display/emitter: uppercase component identifiers.
   - LFR-facing display/emitter: lowercase component identifiers.

## 5) GUI Display Requirement

- In component library table view, component syntax MUST be displayed using LFR naming style.
- Recommended fixed UI notice text:
  - `Components in this library are displayed using the LFR naming standard (lowercase snake_case).`

## 6) Examples

1. Component type
   - Canonical: `droplet_generator`
   - MINT: `DROPLET_GENERATOR`
   - LFR: `droplet_generator`

2. Invalid separator
   - Input: `flow-rate`
   - Normalized/Expected: `flow_rate`
   - Validation: reject raw `-` in identifiers.

3. Mixed-case GUI input
   - Input: `FlowRate`
   - Canonical: `flow_rate`
   - MINT export: `FLOW_RATE`
   - LFR export: `flow_rate`

## 7) Suggested Validation Messages

- `Invalid identifier: use letters, digits, and underscore only.`
- `Invalid identifier format: use snake_case for multi-word names.`
- `LFR requires lowercase snake_case component names.`
- `MINT display uses uppercase component names for the same component type.`
- `This component name does not follow LFR naming rules. Convert to lowercase snake_case?`
- `Import blocked: custom component names must follow LFR lowercase snake_case.`

## 8) Versioning

- Version: `v1`
- This spec applies to component library naming and generated component identifier views in both NeptuneGUI and Neptune compiler workflows.
