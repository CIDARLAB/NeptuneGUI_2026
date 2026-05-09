# Naming and Syntax Spec v1

This document defines the naming and syntax normalization rules for Neptune MINT and LFR representations.

## 1) Purpose

- Keep MINT and LFR visually distinct.
- Make parser behavior predictable.
- Allow GUI input to be user-friendly while preserving strict saved output.

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
8. **GUI accepts flexible input**
   - GUI may accept mixed case input for convenience.
9. **Save/export is strict**
   - When saved or exported, output MUST be normalized to strict mode casing.
10. **Round-trip stability**
   - `MINT -> AST -> MINT` and `LFR -> AST -> LFR` should produce stable normalized text.

## 4) Normalization Pipeline

1. Parse user input (tolerant mode in GUI).
2. Convert identifiers to canonical lowercase `snake_case` in AST.
3. Validate syntax and semantic constraints.
4. Emit output by target mode:
   - MINT emitter: uppercase identifiers.
   - LFR emitter: lowercase identifiers.

## 5) Examples

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

## 6) Suggested Validation Messages

- `Invalid identifier: use letters, digits, and underscore only.`
- `Invalid identifier format: use snake_case for multi-word names.`
- `LFR requires lowercase identifiers.`
- `MINT requires uppercase identifiers.`
- `Identifier normalized from "<input>" to "<normalized>".`

## 7) Versioning

- Version: `v1`
- This spec applies to component library definitions and generated syntax views in both NeptuneGUI and Neptune compiler workflows.
