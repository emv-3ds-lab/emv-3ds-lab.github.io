EMVCo 3-D Secure — Spec Reference Notice
========================================

This project (the EMV 3-D Secure Protocol Lab) is an independent
visualisation, comparison, and debugging tool. It is **not** affiliated
with, endorsed by, or sponsored by EMVCo, LLC.

What the lab does
-----------------

The lab references the EMV 3-D Secure specification (versions 2.1.0
through 2.4.0-draft) for the following purposes, all of which fall
within fair use for educational and research purposes:

1. **Protocol field names.** The lab uses the EMVCo-defined field names
   (for example, `threeDSServerTransID`, `deviceChannel`,
   `challengePreference`) as identifiers. These are short, technical
   strings that are not themselves copyrightable, and they are the only
   way to faithfully render a 3DS message.

2. **Section citations.** Every node, edge, and message in the
   visualiser cites the EMVCo section it draws from (e.g. "3DS Core
   Spec §5.2.1.4"). Section numbers and headings are referenced, not
   reproduced verbatim.

3. **Message structure.** The lab models the structure of 3DS messages
   (AReq, ARes, CReq, CRes, RReq, RRes, PReq, PRes, Erro) as
   documented in the spec. The lab does not reproduce the spec's
   normative text.

4. **Synthetic payloads.** All rendered payloads inside the lab are
   **synthetic**. No real PAN, no real BIN, no real
   `threeDSServerTransID`, no real JWS signature, and no live ACS
   call. Every rendered payload is watermarked as synthetic in the UI.
   Copying or exporting payload material requires an explicit user
   action from the interface; nothing is transmitted automatically.

What the lab does not do
------------------------

- It does not reproduce the EMV 3DS Core Specification, the EMV 3DS
  SDK Specification, the EMV 3DS Specification Bulletin, or the EMV
  3DS Split-Server Domain document.
- It does not paraphrase the normative prose of any EMVCo document.
- It does not claim that its models are authoritative for any
  certification, conformance, or production deployment.
- It does not redistribute any EMVCo document in this repository.

Reporting an over-reach
-----------------------

If you believe a passage in this repository crosses the line from
reference into reproduction, please open a private issue via the
process in `SECURITY.md` or contact the maintainer directly. We will
act on genuine over-reach within the 90-day CVD window.

EMV® and EMVCo® are registered trademarks of EMVCo, LLC. The
specification documents are © EMVCo, LLC, all rights reserved.
