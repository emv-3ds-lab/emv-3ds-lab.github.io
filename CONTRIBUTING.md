# Contributing

Thanks for helping improve the EMV 3DS Protocol Lab.

This project is a public reference tool for understanding EMV 3-D Secure behavior. Contributions are most useful when they improve correctness, clarity, scenario coverage, and citation quality.

## Good Contribution Areas

- new scenario presets or branch coverage
- message-level explanation improvements
- spec-anchor corrections
- `transStatus` or `resultsStatus` reference improvements
- glossary and terminology clarifications
- public vendor vocabulary crosswalks backed by sources
- accessibility and usability improvements to the explorer

## Before You Change Protocol Behavior

Please keep these rules in mind:

1. EMVCo semantics are the base model.
2. Vendor behavior should be modeled as an overlay, not as the core flow definition.
3. Technical discrepancies should map to specific requirement IDs whenever possible.
4. PReq/PRes is treated as a prerequisite "Step 0" context, not as the start of the per-transaction browser flow.
5. Support for decoupled auth (`D`), requestor opt-out (`resultsStatus = 02`), and SPC-related statuses must remain intact.

## Repo Hygiene

- Keep local notes, private extracts, and uploads out of the public artifact set.
- Store local documentation and private reference material under `local-notes/` or another ignored path.
- Do not commit `prism-uploads/` contents if they are only local working materials.

## Development

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## How To Propose Changes

### Scenario or protocol logic changes

Include:

- the user-visible outcome
- the protocol branch being modeled
- the spec section or requirement anchor
- any version-specific behavior
- whether the step is browser-visible, hidden in an iframe, or server-side

### Documentation changes

Include:

- what claim changed
- what public source supports the change
- whether the terminology is EMVCo-native or vendor-specific

## Style Expectations

- Prefer small, structured data changes over hard-coded prose in UI components.
- Keep comments concise and only where the logic is not self-evident.
- Preserve the project's role as a protocol lab rather than turning it into a gateway demo.

## Testing Expectations

At minimum, contributors should:

1. run a production build
2. sanity-check the affected scenario branches in the UI
3. verify that public-facing claims remain anchored to sources

## Communication

When reporting bugs or proposing changes, the most helpful format is:

1. current behavior
2. expected behavior
3. relevant scenario and status outcome
4. supporting spec anchor or public source
5. screenshots if the issue is UI-related

That makes it much easier to keep the project technically rigorous and publicly trustworthy.
