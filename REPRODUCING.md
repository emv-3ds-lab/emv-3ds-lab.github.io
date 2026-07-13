# Reproducing the Lab

> **Audience.** Reviewers and fellow researchers who want to verify the
> lab's claims, run the spec-conformance test suite, or replay a
> capture through the JWS inspector. The lab is deterministic; given
> the same inputs, every test should produce the same output.

## 1. Environment

The lab targets the following environment. We test on Windows 11 with
PowerShell, but any POSIX shell should work with minor adjustments.

| Tool       | Version           | Notes                                  |
|------------|-------------------|----------------------------------------|
| Node.js    | 22 LTS or newer   | CI pins Node 22 for release checks.    |
| pnpm       | 9.x or newer      | The `package.json` scripts use pnpm.   |
| Vite       | 8.x (transitive)  | Brought in by the dev dependency.      |
| TypeScript | 6.x               | Built with `tsc -b` (project references). |
| Vitest     | 2.1.x             | `happy-dom` env; runs in CI.           |
| OS         | Windows / Linux   | We test on Windows; Linux works.       |

## 2. Bootstrap

```bash
# 1. Clone (replace with the canonical URL when forking).
git clone https://github.com/emv-3ds-lab/emv-3ds-lab.github.io.git emv-3ds-protocol-lab
cd emv-3ds-protocol-lab

# 2. Install dependencies (use pnpm, never npm).
pnpm install

# 3. Verify the install.
pnpm --version
node --version
```

The repo's `.gitignore` already excludes the comparison repo
(`comparison/3DSv2-api-documentation/`), the verbatim EMVCo spec files
(`EMV-3-D-Secure-*.md`), and the synthetic JWS sample log
(`local-notes/sandbox-test/`). If you intend to run the full
field-provenance tests, you must provide your own copy of the EMVCo
v2.3.1 Core Spec at `local-notes/EMVCo_3DS_CoreSpec_v2.3.1_20220831.md`
and the comparison repo under `comparison/3DSv2-api-documentation/`.
These are not redistributed.

## 3. Run the release checks

```bash
pnpm lint
pnpm test
pnpm build
```

The publication-ready baseline is:

- `pnpm lint` passes without diagnostics from `oxlint`
- `pnpm test` passes all Vitest suites
- `pnpm build` produces a deterministic `dist/` bundle

## 4. Run the spec-conformance test suite

```bash
pnpm test
```

The expected output is:

```
 RUN  v2.1.9 C:/…/emv-3ds-protocol-lab

 ✓ src/data/payloads/__tests__/registry.test.ts (31 tests)
 ✓ src/utils/jwsValidator.test.ts (8 tests)
 ✓ src/stores/flowStore.test.ts (7 tests)
 ✓ src/utils/snapshot.test.ts (8 tests)
 ✓ src/utils/protocolViz.test.ts (7 tests)

 Test Files  5 passed (5)
      Tests  61 passed (61)
```

The `registry.test.ts` suite is the lab's safety net. It asserts
that every registered payload builder emits *exactly* the field set
the field-provenance registry says should be on the wire for the
active protocol version. If a future PR adds a field to a builder
without registering it (or vice versa), this suite fails.

## 5. Run the dev server

```bash
pnpm dev
```

This boots Vite on `http://localhost:5173` and watches the source
tree. Open the page in a browser. The default scenario is
"Frictionless Y"; the default protocol version is v2.3.1.

## 6. Build a production bundle

```bash
pnpm build
```

This runs `tsc -b` (TypeScript project-references build) followed by
`vite build`. The output is in `dist/`. The build is deterministic
given a fixed Node / pnpm version.

## 7. Reproduce the JWS inspector validation

The JWS inspector at the bottom of the DetailsPanel accepts both
JWS-compact-serialized and raw JSON. To verify the validator:

1. Click any wire-message step in the canvas (e.g. "Step 6a —
   Formats AReq Message"). The DetailsPanel slides open.
2. In the "Paste a real AReq" textarea, paste any AReq-shaped JSON
   (e.g. the synthetic payload from the `getPayload('AReq', scenario)`
   helper). Validation runs locally; no network call.
3. The validator should:
   - Accept the payload if every field is in the active version's
     `expectedFields` set.
   - Flag every field that is in the wrong version with an
     "Added in v2.x.x — not in v2.y.y" annotation.
   - Compute the JWS detached-MAC failure mode if a signature is
     present and the JWK is in `jwsValidator.ts`'s pinned set.

## 8. Generate a snapshot for sharing

The lab exports a versioned JSON snapshot per `SNAPSHOT_SCHEMA_VERSION`
in `src/utils/snapshot.ts`. To reproduce:

```bash
pnpm dev
# In the browser, click "Snapshot" → "Download snapshot.json".
# The file is valid against `parseSnapshot`.
```

The snapshot file's `schemaVersion` is currently `1`. The validator
forwards-compatibility-warns on a higher number; the lab does not
backward-compat-warn on a lower number (research-only posture).

## 9. Compare protocol versions

The header's protocol-version toggle (`2.1.0` / `2.2.0` / `2.3.1` /
`2.4.0`) re-renders every wire message from the versioned registry.
A reviewer can:

1. Pick `2.1.0` and click "Step 6a". The inspector shows a
   single-string `threeDSRequestorChallengeInd` and the
   `browserJavaEnabled` field.
2. Pick `2.2.0`. The inspector now shows
   `browserJavascriptEnabled` and the new
   `threeDSRequestorDecMaxTime` / `threeDSRequestorDecReqInd`
   fields, plus `whiteListStatus`.
3. Pick `2.3.1`. `whiteListStatus` is renamed to
   `trustListStatus`, `threeDSRequestorChallengeInd` becomes an
   array, and 29 new fields (e.g. `acceptLanguage`, `appIp`,
   `deviceId`, `payTokenInfo`, `taxId`, `userId`) appear.

`2.4.0` is a preview surface today; the registry falls back to
`2.3.1` per the `getVersionedPayload` fallback rule until native
builders land.

## 10. Replay a capture (research-only)

The lab is not a network tool, but the JWS inspector can be used to
hand-validate a capture. To replay a capture:

1. Extract one message (e.g. the ARes) from a real capture in
   `pcapng` or `tshark` output.
2. Decode the JWS body (`echo "eyJ…" | base64 -d`).
3. Paste the JSON into the inspector.
4. Switch the lab's protocol version to the version the capture
   claims and verify the field set is consistent.

This workflow is documented in detail in
`local-notes/research-workflows/capture-reconstruction.md` (not
checked into the public repo).

## 11. License posture

The lab is Apache-2.0. The EMVCo v2.3.1 Core Spec is a personal-use
copy under `local-notes/`; it is git-ignored and must not be
redistributed. The 3dsecure.io re-typeset under
`comparison/3DSv2-api-documentation/` is similarly excluded. See
`LICENSES/EMVCo-notice.md` for the full chain-of-custody posture.

## 12. CI

A GitHub Actions workflow at `.github/workflows/test.yml` runs lint,
test, and build on every push and PR. The deploy workflow reuses the
same checks before publishing GitHub Pages. Both workflows pin Node 22
and pnpm 9.
