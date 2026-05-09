# Naming and Syntax Spec v1

This document defines the naming and syntax normalization rules for Neptune MINT and LFR representations.

## 1) Purpose

- Keep MINT and LFR visually distinct.
- Make parser behavior predictable.
- Enforce strict LFR naming for imported custom components.

## 2) Canonical Internal Form

- Neptune internal AST/JSON uses `snake_case` keys and identifiers.
- Internal canonical names are lowercase `snake_case`.
- Serialization rules:
  - AST -> MINT: uppercase conversion.
  - AST -> LFR: lowercase conversion.

## 3) Core Rules (Normative)

1. **LFR only lowercase**
   - All keywords, component types, parameter names, and port names MUST be lowercase.
2. **MINT only uppercase**
   - All keywords, component types, parameter names, and port names MUST be uppercase.
3. **Multi-word syntax uses underscore**
   - Multi-word identifiers MUST use `_` separators.
4. **No spaces or hyphens in identifiers**
   - `flow_rate` is valid; `flow-rate` and `flow rate` are invalid.
5. **Identifier character set**
   - Identifiers MUST match: `^[A-Za-z][A-Za-z0-9_]*$` before normalization.
6. **Case is semantic by language mode**
   - Same identifier must render as uppercase in MINT and lowercase in LFR.
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
4. Convert accepted identifiers to canonical lowercase `snake_case` in AST.
5. Validate syntax and semantic constraints.
6. Emit output by target mode:
   - MINT emitter: uppercase identifiers.
   - LFR emitter: lowercase identifiers.

## 5) GUI Display Requirement

- In component library table view, component syntax MUST be displayed using LFR naming style.
- Recommended fixed UI notice text:
  - `Components in this library are displayed using the LFR naming standard (lowercase snake_case).`

## 6) Examples

1. Component type
   - Canonical: `droplet_generator`
   - MINT: `DROPLET_GENERATOR`
   - LFR: `droplet_generator`

2. Parameter
   - Canonical: `flow_rate`
   - MINT: `FLOW_RATE`
   - LFR: `flow_rate`

3. Port name
   - Canonical: `sample_inlet`
   - MINT: `SAMPLE_INLET`
   - LFR: `sample_inlet`

4. Invalid separator
   - Input: `flow-rate`
   - Normalized/Expected: `flow_rate`
   - Validation: reject raw `-` in identifiers.

5. Mixed-case GUI input
   - Input: `FlowRate`
   - Canonical: `flow_rate`
   - MINT export: `FLOW_RATE`
   - LFR export: `flow_rate`

## 7) Suggested Validation Messages

- `Invalid identifier: use letters, digits, and underscore only.`
- `Invalid identifier format: use snake_case for multi-word names.`
- `LFR requires lowercase identifiers.`
- `MINT requires uppercase identifiers.`
- `This component name does not follow LFR naming rules. Convert to lowercase snake_case?`
- `Import blocked: custom component names must follow LFR lowercase snake_case.`

## 8) Versioning

- Version: `v1`
- This spec applies to component library definitions and generated syntax views in both NeptuneGUI and Neptune compiler workflows.
