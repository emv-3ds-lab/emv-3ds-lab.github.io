# EMV 3DS Protocol Lab

An open, vendor-neutral visual lab for understanding, comparing, and debugging EMV 3-D Secure flows.

![EMV 3DS Protocol Lab canvas](src/assets/hero.png)

This project is not a 3DS Server, certification platform, or gateway demo. It is a public reference tool for payment engineers, researchers, and solution teams who need to understand what happened in a 3DS flow, why it happened, and how that behavior maps back to EMVCo semantics.

## Why this exists

Most public 3DS tools help teams run integrations. Fewer help people understand the protocol itself.

This lab is built to fill that gap with:

- an interactive flow explorer
- scenario-driven protocol branches
- step-by-step message and payload inspection
- glossary, domain, and participant reference views
- a security research lens for protocol boundary analysis
- explicit support for important branches such as `D`, opt-out (`resultsStatus = 02`), `I`, and `S`

## What you can do with it

Use the app to answer high-value questions like:

- Why did this flow end in `Y`, `A`, `N`, `R`, `U`, `C`, `D`, `I`, or `S`?
- What does a gateway-visible result correspond to in the actual EMV 3DS branch?
- Which steps are browser-visible, hidden in an iframe, or entirely server-side?
- Which IDs, payload fields, and trust boundaries matter at each phase?
- Where in the spec does a given behavior come from?

## Current product shape

Today the lab already includes:

- a sequence-diagram protocol explorer centered on the browser flow
- scenario switching for method reuse, timeout, DS failure, challenge branches, decoupled auth, opt-out, information-only, and SPC
- message payload inspection for core protocol objects
- per-step plain-language explanations and protocol field guidance
- participant, domain, phase, and glossary reference views
- a research lens that highlights abuse cases, observables, and spec hooks

The next major product milestones are tracked in [docs/roadmap.md](docs/roadmap.md).

## Repo guide

- [Product strategy](docs/product-strategy.md)
- [Roadmap](docs/roadmap.md)
- [Architecture](docs/architecture.md)
- [Competitive landscape](docs/competitive-landscape.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Citation metadata](CITATION.cff)

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages

This project is configured for GitHub Pages deployment with GitHub Actions.

- If the repository name matches `<owner>.github.io`, the app builds with `/` as the base path.
- If the repository is a project repo such as `3ds-diagrams`, the app builds with `/<repo-name>/` automatically.
- For a local dry-run, set `VITE_BASE_PATH` before `npm run build` to mimic the final GitHub Pages subpath.
- `public/.nojekyll` is included so the published artifact is served as plain static files.

The workflow lives in [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

### One-time GitHub setup

1. Initialize a Git repository if needed, then push this project to GitHub.
2. In the repository, open `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` to trigger deployment.

Your site URL will be one of:

- `https://<owner>.github.io/` for a user or organization site repository named `<owner>.github.io`
- `https://<owner>.github.io/<repo-name>/` for a normal project repository

## Licensing

The current repository license remains `AGPL-3.0-only`.

That is the repo's present legal state, not a long-term product recommendation. The strategy discussion around possible future licensing changes is captured in [docs/product-strategy.md](docs/product-strategy.md).
