# EMV 3DS Protocol Lab Architecture

This document describes the public app architecture and the boundaries we want to preserve as the protocol lab evolves.

## Product Boundary

The app is a visual and explanatory reference for EMV 3-D Secure behavior.

It is not:

- a production 3DS Server
- an ACS implementation
- a gateway SDK
- a certification harness

That boundary matters because it keeps the architecture optimized for clarity, inspectability, and citation instead of transaction execution.

## Core Model

The app uses EMV 3DS protocol semantics as the source model and renders those semantics through scenario-driven sequence diagrams.

Key modeling rules:

- the data model is spec-first, not vendor-first
- vendor behavior should appear as optional overlays or terminology crosswalks
- per-transaction flow starts from the browser journey, but out-of-band prerequisites such as PReq/PRes can be shown as prerequisite context
- technical discrepancies should map back to spec requirement IDs where available

## Current Frontend Shape

### Rendering layer

- React + TypeScript application
- React Flow (`@xyflow/react`) for the sequence-diagram canvas
- custom node and edge renderers for participants, phases, swimlanes, and message arrows

### Data layer

- protocol flow logic lives in `src/data/flowData.ts`
- scenario state determines which steps are active and which branches are visible
- glossary, participant reference data, domain overviews, and security-lens notes are stored as structured frontend data

### Presentation layer

- the canvas is the primary interaction surface
- side panels provide detail views for steps, groups, participants, and glossary content
- scenario controls shape the currently rendered branch

## Architectural Priorities

### 1. One canonical scenario model

Scenario state should be the single source of truth for:

- which steps render
- which edges render
- which outcome is implied
- which notes, citations, and warnings apply
- what gets encoded into shareable URLs

### 2. Version-aware semantics

Version support should be explicit in the model rather than buried in prose.

That means we prefer data such as:

- supported protocol versions on scenarios or steps
- version-specific notes and field differences
- diff-friendly metadata for changed behavior

### 3. Inspectable explanations

Each rendered step should be able to answer:

- what this message or action is for
- who can observe it
- what fields or identifiers matter
- why this branch happened
- which spec section or requirement grounds the explanation

### 4. Clean separation between explanation and styling

The explanatory model should remain structured data, not CSS-driven prose fragments embedded in the layout. This keeps the app easier to extend into:

- version diff mode
- scenario catalogs
- vendor crosswalk overlays
- searchable encyclopedic views

## File Responsibilities

### `src/data/flowData.ts`

Holds the protocol knowledge model:

- participants
- step groups
- flow steps
- glossary entries
- participant and domain overviews
- security-lens notes

This is the highest-leverage file for scenario coverage and correctness.

### `src/types.ts`

Defines stable shared types for:

- scenario state
- step metadata
- participant metadata
- reference views
- security annotations

### `src/App.tsx`

Coordinates:

- scenario state
- canvas rendering
- selection state
- shareable URL state
- high-level product UI

### `src/components/`

Contains rendering and detail-panel components. These should remain mostly presentation-focused, with protocol meaning flowing in as typed data.

## Known Engineering Constraints

- Use transparent React Flow backgrounds so dark mode does not occlude diagram layers.
- Prefer DOM order or dedicated node types for hierarchy instead of negative z-index values.
- Memoize custom nodes to keep canvas performance predictable.
- Preserve GitHub Pages compatibility with a dynamic Vite base path and `public/.nojekyll`.

## Next Architectural Extensions

The next features should build on the current model without breaking its clarity:

1. Scenario preset catalog backed by structured metadata.
2. Permalink encoding for reproducible states.
3. Version-aware annotations on steps and glossary content.
4. Event timeline data for debugger-style playback.
5. Vendor crosswalk overlays derived from public terminology mappings.

## Contribution Standard

When adding new protocol behavior:

1. update the structured data model first
2. attach explanation text and observability context
3. add requirement or section anchors when possible
4. only then add presentation affordances

That order keeps the project faithful to its role as a protocol lab rather than a diagram skin.
