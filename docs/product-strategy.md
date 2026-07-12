# EMV 3DS Protocol Lab Strategy

This document positions the current project as a serious public product, not just a diagram viewer. The goal is to identify where the ecosystem is already crowded, what users repeatedly return to, and where this project can become the default reference instead of another static explainer.

## Strategic Conclusion

The strongest public 3DS products today fall into adjacent categories:

1. commercial 3DS server sandboxes
2. gateway testing guides and sample apps
3. SDKs and integration libraries
4. official explainers and white papers

Those categories solve implementation and operations problems well. They do not clearly own the vendor-neutral, spec-anchored, visual understanding layer.

That is the opening.

This project should not compete as "an open 3DS server." It should become the **vendor-neutral EMV 3DS protocol lab**:

- an interactive flow explorer
- a scenario workbench
- a message and outcome inspector
- a version-diff reference
- a bridge between EMVCo language and vendor language

If executed well, that is a category with real room to win.

## Evidence Base

This strategy is based on the current repo shape and a review of public materials from:

- [3dsecure.io sandbox and docs](https://docs.3dsecure.io/3dsv2/sandbox.html)
- [Stripe Workbench 3DS debugging article](https://stripe.dev/blog/easily-debug-your-3ds-authentication-with-stripe-workbench.md)
- [EMVCo interactive white paper update](https://www.emvco.com/knowledge-hub/optimising-online-payment-authentication-with-emv-3-d-secure/)
- gateway testing docs from Braintree, Elavon, SumUp, and Yuno
- public sample repos such as `agnosco`, `gpapi-3ds2`, `3ds-merchant-example`, and `web-threeds`

## Market Map

| Category | What users get today | What those products do well | Where they stop short |
|---|---|---|---|
| Commercial 3DS server sandboxes | Deterministic test cases, challenge flows, decoupled flows, version docs | Strong testing UX, concrete success criteria, realistic integration guidance | Vendor-specific, not designed as neutral protocol references |
| Gateway docs and sample apps | "How to integrate our flow" | Fast onboarding, practical callbacks, test cards, operational guidance | Usually flatten protocol nuance into gateway abstractions |
| SDKs and client libraries | Browser/app integration primitives | Strong packaging, tests, dev ergonomics | Built to embed behavior, not explain protocol behavior |
| Official EMVCo explainers | High-level practical guidance | Trust, terminology, use-case framing, better accessibility than raw specs | Not an open exploratory workbench and not built for cross-vendor comparison |

## The Gap

The ecosystem is crowded with products that help people **run** EMV 3DS. It is much thinner on products that help people **understand** EMV 3DS.

The missing layer is:

- spec-anchored but easier to consume than the PDFs
- public and vendor-neutral
- visual, interactive, and scenario-driven
- useful to both researchers and working payment engineers
- good at explaining why a branch happened, not just that it happened

That is exactly where this project can live.

## Current Product Assessment

The current app already has meaningful advantages:

- a strong sequence-diagram canvas
- scenario-driven branching already modeled in code
- message payload and glossary support
- phase grouping and protocol-domain framing
- a security research lens that few public tools attempt
- explicit support for important paths such as `D`, opt-out, and SPC-related statuses

In other words: the project already has a real core. It is not starting from zero.

What it does **not** yet clearly provide as a product:

- a first-class scenario catalog users can browse by outcome
- a debugger-style event timeline users can inspect like Stripe Workbench
- explicit version diffing across `2.1.0`, `2.2.0`, and `2.3.1`
- a vendor crosswalk that maps EMVCo terms to gateway terms and test cases
- an obvious public packaging story for researchers, contributors, and payment teams

So the strategic move is not "invent a new direction." It is "package the existing strengths into a category, then fill the highest-leverage gaps."

## Positioning

### Recommended category

**EMV 3DS Protocol Lab**

### Recommended one-line positioning

An open, vendor-neutral visual lab for understanding, comparing, and debugging EMV 3DS flows.

### Recommended expanded positioning

EMV 3DS Protocol Lab is a public reference tool for payment engineers, researchers, and solution teams who need to understand how EMV 3DS behaves across frictionless, challenge, decoupled, 3RI, OOB, and SPC-related paths. It is not a production 3DS server and not a gateway integration kit. Its job is to make protocol behavior explorable, explainable, and citable.

### What not to call it

Avoid positioning it as:

- an open-source 3DS server
- a certification platform
- a gateway demo
- a generic diagram site

Those categories either have stronger incumbents or undersell what is special here.

## Target Users

### Primary users

1. Payment engineers integrating or debugging 3DS
2. Researchers studying protocol behavior, safety, or UX tradeoffs
3. Architects comparing issuer, gateway, and EMVCo flow semantics

### Secondary users

1. QA teams validating scenario coverage
2. Product managers working on checkout and SCA
3. Compliance and solution teams who need a common visual reference

## Jobs To Be Done

Users come back to products when they reliably help complete high-value tasks. For this project, the repeat-use jobs are:

1. "Show me why this flow ended in `C`, `D`, `R`, or `U`."
2. "Map this gateway outcome back to the real EMV 3DS branch."
3. "Compare the same scenario across `2.1.0`, `2.2.0`, and `2.3.1`."
4. "Give me a clean explanation I can send to a teammate or cite in a note."
5. "Help me test a known scenario without setting up a commercial sandbox."

That is what makes a protocol lab sticky.

## Why This Can Win

The project has a credible wedge because it sits at an unusual intersection:

- **visual like an explainer**
- **structured like a testing tool**
- **grounded like a reference manual**
- **inspectable like a debugger**
- **neutral enough to compare vendors without becoming one**

Most adjacent tools are strong on one or two of those dimensions. Very few are strong on all of them.

## Product Strategy

### Core thesis

The product should answer three questions better than anything else in public:

1. What happened?
2. Why did it happen?
3. Where does that behavior come from in EMV 3DS and in vendor implementations?

### Product pillars

1. **Protocol Explorer**  
   Keep the canvas as the center of the experience.

2. **Scenario Catalog**  
   Make outcomes discoverable by intent, not just by step playback.

3. **Message Inspector**  
   Turn each step into a practical message explanation, not only a visual node.

4. **Version Diff Mode**  
   Let users compare semantics across spec versions directly.

5. **Vendor Crosswalk**  
   Add an optional comparison layer without letting vendors dominate the product model.

6. **Citation Layer**  
   Every serious claim should be traceable to a spec section, requirement, or public vendor doc.

## Feature Gap Analysis

| Capability | Current state | Why it matters | Best external pattern | Priority |
|---|---|---|---|---|
| Interactive flow exploration | Strong | This is already the product's anchor | EMVCo interactive white paper | Keep leading |
| Scenario presets by outcome | Partial | Users think in outcomes, not internal state trees | 3dsecure.io sandbox matrices | High |
| Message-level explanation | Partial | Drives understanding and trust | 3dsecure.io practical docs | High |
| Raw event / result inspection | Weak | Greatly improves debugging value | Stripe Workbench | High |
| Version comparison | Weak | Essential for spec literacy and field provenance | 3dsecure.io version docs | High |
| Vendor comparison layer | Missing | Makes the tool useful in real integration work | Gateway test docs | High |
| Shareable state / permalink | Partial | Needed for collaboration and citations | Modern dev tools baseline | High |
| Exportable diagrams | Partial | Needed for docs, teaching, and papers | Expected table stakes | Medium |
| Contribution and research packaging | Weak | Helps default-reference adoption | Mature OSS reference tools | High |

## What To Copy From Best-In-Class Tools

### From 3dsecure.io

- deterministic scenario triggers
- stable, public test cases
- explicit version awareness
- concrete step-by-step guidance

### From Stripe Workbench

- debug-first framing
- event visibility
- raw data inspection
- quick explanation of why a state changed

### From gateway testing docs

- "if you want outcome X, use case Y" navigation
- highly practical matrices
- realistic testing language

### From EMVCo's interactive white paper

- use-case framing
- visual teaching
- practical explanation of difficult branches like challenge, SPC, and decoupled auth

## The Winning Wedge

The right wedge is not "more diagrams." It is:

- one place to understand **why** a flow happened
- one place to compare **EMVCo vs vendor behavior**
- one place to inspect **message fields and branch conditions**
- one place to map **spec text to observable browser flow**

That wedge is strong because it compounds. Once users trust the explanation layer, they start using the same product for onboarding, debugging, research notes, and vendor comparisons.

## 90-Day Roadmap

## Days 1-30: Package the category

Goal: make the project obviously legible as a public protocol lab.

Deliver:

- rewrite README around the Protocol Lab positioning
- add screenshot-heavy landing material
- add `CITATION.cff`, `CONTRIBUTING.md`, `SECURITY.md`, and `ROADMAP.md`
- add first-class scenario presets for major outcomes:
  `Y`, `A`, `N`, `R`, `U`, `I`, `C`, `D`, `S`, method timeout, challenge timeout, opt-out, 3RI, OOB, SPC
- add shareable permalink state
- add diagram export

Success signal:

- a new visitor understands the product category in under two minutes

## Days 31-60: Turn it into a reference

Goal: raise trust and repeat-use value.

Deliver:

- message inspector with plain-language purpose, key fields, and version notes
- version diff mode for `2.1.0`, `2.2.0`, `2.3.1`
- transStatus and resultsStatus encyclopedia
- dedicated explainer pages for decoupled auth, 3RI, SPC, and opt-out
- visible spec anchors throughout the UI
- small vendor note overlays for a few public providers

Success signal:

- users share the tool as an explanation reference, not just a visualization

## Days 61-90: Make it sticky

Goal: create repeat workflows and stronger public credibility.

Deliver:

- sandbox/test matrix page mapping public test cases to expected outcomes
- debugger-style event panel for scenario playback
- vendor vocabulary crosswalk page
- browser regression tests for key branches
- short technical note or preprint describing the design and research use case
- release cadence with changelog and versioned screenshots

Success signal:

- the project is linkable in papers, internal docs, bug reports, and onboarding materials

## Repo Recommendation

Recommended public repo shape:

```text
docs/
  product-strategy.md
  roadmap.md
  architecture.md
  competitive-landscape.md
src/
public/
.github/
  ISSUE_TEMPLATE/
  workflows/
CITATION.cff
CONTRIBUTING.md
SECURITY.md
README.md
```

Recommended public presentation:

- one canonical repo
- one live demo
- one clear category label: "EMV 3DS Protocol Lab"
- one concise screenshot-first README
- one short architecture document for serious readers

Recommended repo stance:

- keep the tool repo narrowly focused on the public app and public docs
- keep private spec extracts and local notes outside the public artifact set
- use issues and discussions around scenarios, version diffs, and citations, not around generic "design ideas"

## License Recommendation

Current state: `AGPL-3.0-only`

That license is philosophically coherent, but it changes who will comfortably adopt, extend, and contribute to the project.

### Primary recommendation

If the goal is to become the default community reference, move to:

- **app code:** `MPL-2.0`
- **written docs and diagrams:** `CC-BY-4.0`

Why:

- `MPL-2.0` is materially easier for payment companies and SDK teams to accept than AGPL
- it still preserves reciprocity at the file level
- it matches the role of a public reference tool better than a strong network copyleft license
- it lowers hesitation around embedding, forking, and contribution

### When to keep AGPL instead

Keep `AGPL-3.0-only` only if the priority is explicitly:

- anti-enclosure
- mandatory reciprocity for hosted derivatives
- public-good governance over maximum adoption

That is a valid choice. It is just a different product strategy.

### Blunt recommendation

For this specific project, the stronger strategic move is:

**use a permissive-enough research/reference posture rather than a defensive SaaS posture.**

In practice, that means `MPL-2.0` for the app and `CC-BY-4.0` for docs is the cleaner route if "be the default reference" is the real goal.

Note: this is a product recommendation, not legal advice.

## Risks

### Strategic risks

1. Becoming too broad and drifting into "payments encyclopedia" instead of a focused protocol lab
2. Becoming too vendor-heavy and losing the neutral core
3. Becoming too spec-heavy and losing practical developer usefulness
4. Staying visually impressive but not operationally useful enough for repeat visits

### How to manage them

1. Keep EMVCo semantics as the base model
2. Make vendor overlays optional
3. Prioritize scenarios, message inspection, and version diffs before adding new surface area
4. Measure reuse through permalink shares, citations, and issue references, not only stars

## Metrics That Actually Matter

Early signals:

- permalink shares
- screenshots used in docs or posts
- issue references from engineers using the tool to explain a bug or integration problem
- citations in notes, slide decks, or research materials

Stronger signals:

- used for onboarding inside a payments team
- linked from a university page, paper, or technical report
- referenced in gateway comparison discussions
- external contributors improving scenarios, citations, or version diffs

## Final Recommendation

The project has a real chance to become the default public reference in a gap that is visible and underserved.

The right move is not to chase commercial 3DS server parity.

The right move is to become the best public answer to:

- what happened
- why it happened
- how the spec describes it
- how vendors expose it

That is a stronger, clearer, and more defensible category than "another diagram site."

## Immediate Next Moves

1. Reframe the repo and README around "EMV 3DS Protocol Lab."
2. Build the scenario catalog and version diff mode next.
3. Add a debugger-style inspection layer after that.
4. Decide licensing based on whether adoption or reciprocity is the top objective.
5. Package the project as both software output and research output.
