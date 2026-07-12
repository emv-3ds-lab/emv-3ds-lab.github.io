# Competitive Landscape

This project sits in a crowded ecosystem for running EMV 3DS, but a much thinner ecosystem for explaining EMV 3DS well.

The purpose of this document is to keep that distinction sharp so the product stays strategically focused.

## Market Categories

### Commercial 3DS sandboxes

Examples in the ecosystem:

- hosted 3DS Server sandboxes
- gateway-integrated testing portals
- PSP-specific challenge simulators

What they do well:

- deterministic test cases
- realistic operational guidance
- implementation-oriented debugging
- strong success and failure matrices

Where they stop:

- they are usually vendor-specific
- they do not act as neutral protocol references
- they flatten EMVCo semantics into product abstractions

### Gateway docs and sample apps

Examples in the ecosystem:

- hosted integration guides
- client SDK examples
- merchant onboarding flows

What they do well:

- reduce time-to-first-integration
- explain callback wiring and test credentials
- map product-specific result codes to merchant actions

Where they stop:

- they rarely explain why a protocol branch happened in EMV terms
- they optimize for product adoption, not vendor-neutral understanding

### SDKs and client libraries

What they do well:

- package browser or app-side behavior
- improve developer ergonomics
- enforce implementation discipline

Where they stop:

- they are built to execute flows, not teach them
- they are poor venues for comparative or research-oriented explanation

### Official explainers and white papers

What they do well:

- establish trusted terminology
- provide practical framing for challenge, decoupled, or SPC-related flows
- improve accessibility relative to raw specifications

Where they stop:

- they are not open exploratory workbenches
- they do not provide community-driven scenario inspection
- they are not designed for side-by-side vendor comparison

## Product Positioning

The opportunity is not to beat incumbent tools at transaction execution.

The opportunity is to own the vendor-neutral visual understanding layer:

- interactive flow explorer
- scenario workbench
- message inspector
- version diff reference
- citation-friendly public reference

## What We Should Learn From Adjacent Tools

### Learn from commercial sandboxes

- scenario determinism
- outcome-driven navigation
- practical naming of test branches

### Learn from debugging tools

- event visibility
- raw result inspection
- quick explanation of state transitions

### Learn from official explainers

- vocabulary discipline
- use-case framing
- careful explanation of difficult branches

## What We Should Not Copy

- vendor lock-in language
- product-first abstraction that hides EMV semantics
- “just enough to integrate” explanations that collapse nuance
- broad payment-platform sprawl unrelated to 3DS protocol understanding

## Strategic Test

Before adding a new feature, ask:

1. Does this make protocol behavior easier to understand?
2. Does this improve trust, inspectability, or citation quality?
3. Does this keep EMVCo semantics as the core model?
4. Would a researcher or payment engineer return to use this again?

If the answer is mostly no, the feature likely belongs outside the main product.

## Current Differentiators

Relative to public alternatives, this project is strongest when it emphasizes:

- visual sequence-diagram exploration
- scenario-driven branching
- plain-language protocol explanation
- message and outcome inspection
- security and research framing
- explicit handling of underexplained branches such as decoupled auth, opt-out, and SPC-related states

## Where To Compete Aggressively

The product should aim to be best-in-class at:

- explaining why a flow ended in `Y`, `A`, `N`, `R`, `U`, `C`, `D`, `I`, or `S`
- mapping gateway-visible outcomes back to EMV branches
- showing which steps are hidden, browser-visible, or server-side
- comparing semantic differences across versions
- turning spec language into citable, explorable public artifacts
