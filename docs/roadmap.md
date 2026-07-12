# EMV 3DS Protocol Lab Roadmap

This roadmap operationalizes the strategy in [product-strategy.md](./product-strategy.md) and keeps the project focused on becoming the default vendor-neutral reference for understanding EMV 3-D Secure behavior.

## Product Goal

Build the best public answer to four questions:

1. What happened?
2. Why did it happen?
3. Where does that behavior come from in EMV 3DS?
4. How do public vendor abstractions map back to the protocol?

## Principles

- Keep EMVCo semantics as the base model.
- Treat vendor behavior as an overlay, not the core ontology.
- Prioritize explorable scenarios and message-level explanation over surface-area growth.
- Anchor technical claims to spec sections and requirement IDs whenever possible.
- Preserve the repo as a clean public artifact; keep local notes and private extracts outside tracked project files.

## Release Themes

### Phase 1: Package The Category

Goal: make the project immediately legible as an EMV 3DS Protocol Lab.

In scope:

- protocol-lab positioning across README and repo metadata
- public project docs for roadmap, architecture, contribution flow, and citation
- first-class scenario presets for major outcomes and edge cases
- shareable app state and stable permalink behavior
- diagram export suitable for docs, bug reports, and research notes

Success signal:

- a new visitor understands the product category in under two minutes

### Phase 2: Raise Trust

Goal: make the app citable and dependable as a working reference.

In scope:

- message inspector with plain-language purpose and key field guidance
- visible version awareness across `2.1.0`, `2.2.0`, and `2.3.1`
- `transStatus` and `resultsStatus` encyclopedia views
- dedicated explainers for decoupled auth, 3RI, SPC, and requestor opt-out
- explicit spec anchors across scenarios and branch conditions
- a small vendor crosswalk for public gateway terminology

Success signal:

- users share the tool as an explanation reference, not just a diagram

### Phase 3: Make It Sticky

Goal: support repeat workflows for researchers and payment engineers.

In scope:

- debugger-style event timeline for scenario playback
- public test matrix that maps scenarios to expected outcomes
- vendor vocabulary crosswalk pages
- browser-based regression coverage for critical branches
- short technical note or preprint describing research and teaching value
- changelog discipline with versioned screenshots

Success signal:

- the project is linkable in papers, onboarding docs, bug reports, and internal debugging threads

## Near-Term Implementation Backlog

### UX and App Surface

- Add scenario presets grouped by intent:
  - frictionless approve
  - frictionless attempts
  - challenge success
  - challenge failure
  - challenge timeout
  - decoupled auth
  - requestor opt-out
  - information-only
  - SPC
  - 3RI
  - DS failure
  - method timeout
- Add explicit protocol version selection and version-aware notes.
- Add share/copy permalink actions for current app state.
- Add diagram export actions with stable filenames.
- Add outcome chips that summarize the current scenario in one glance.

### Reference Layer

- Add spec-anchor metadata to steps, scenarios, and glossary entries.
- Add plain-language reason strings for why a branch is active.
- Add per-scenario notes for user visibility and security relevance.
- Add version-diff annotations where branch semantics change.

### Research and Public Packaging

- Add issue templates for scenario proposals, citation corrections, and spec discrepancies.
- Add release notes format for scenario additions and requirement-anchor changes.
- Publish screenshot-first examples for key branches.

## Explicit Non-Goals

This project should not drift into:

- a production 3DS Server
- a certification platform
- a gateway-specific sample app
- a general payments encyclopedia

## Tracking

When new work lands, classify it under one of these buckets:

- `explorer`
- `scenario-catalog`
- `message-inspector`
- `version-diff`
- `vendor-crosswalk`
- `citation-layer`
- `research-packaging`

That keeps the repo aligned with the product strategy instead of growing ad hoc.
