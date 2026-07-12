# Security Policy

## Scope

This repository is a public reference and visualization tool for EMV 3DS behavior. Security reports are still welcome because:

- the app may contain real web vulnerabilities
- incorrect protocol explanations can mislead downstream security analysis
- incorrect branch handling can create false trust in reproduced flows

## How to report

Please avoid posting sensitive details in a public issue first.

Preferred approach:

1. Use GitHub Security Advisories or another private maintainer contact channel if available.
2. Share a clear description, affected files or screens, reproduction steps, and impact.
3. Include protocol anchors if the issue is about EMV 3DS semantics rather than only app behavior.

## What to include

A strong report includes:

- whether the issue is an application vulnerability, a protocol modeling flaw, or both
- exact reproduction steps
- screenshots, payloads, or traces where helpful
- expected behavior
- actual behavior
- relevant requirement IDs, tables, or public references if known

## Disclosure expectations

This project aims to follow coordinated disclosure in good faith.

Default expectations:

- acknowledge receipt as quickly as possible
- validate and scope the report
- coordinate on a reasonable disclosure timeline for confirmed issues
- avoid publicizing dangerous details before a fix or mitigation exists

## Out of scope

The following are usually out of scope unless they produce a concrete integrity or trust problem:

- styling-only issues
- speculative protocol claims without a reproducible mismatch
- disputes over non-authoritative vendor wording without evidence of user harm

## Safe reporting reminder

Please do not include:

- personal payment data
- live secrets
- credentials for real merchant or issuer systems
- exploit chains against third-party infrastructure you do not own
