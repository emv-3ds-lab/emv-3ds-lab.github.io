/**
 * JWS / AReq / ARes client-side validator.
 *
 * Scope: this is a *structural* validator, not a cryptographic verifier.
 * It performs:
 *   - base64url decoding of header / payload / signature
 *   - JSON parse of header and payload
 *   - required-field checks against the EMVCo Table A.1 / B.1 schema
 *   - structural sanity (3 dot-separated segments, base64url alphabet)
 *   - version-aware "is this message legal in v2.3.1?" predicates
 *
 * It does NOT verify the JWS signature against a JWK — that requires
 * the issuer's public key and is explicitly out of scope for a
 * client-side reference tool. We surface the signature presence and
 * base64url validity as a non-cryptographic sanity check.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ValidationIssue {
  /** The EMVCo field name (or `jws.<part>` for JWS structural issues). */
  field: string;
  /** Severity tier — drives color and ordering in the UI. */
  severity: Severity;
  /** Human-readable description. */
  message: string;
  /** Spec reference, e.g. '§3.7', 'Table A.1'. */
  specRef: string;
  /** Optional suggested fix. */
  suggestion?: string;
}

export interface DecodedJws {
  raw: string;
  headerB64: string;
  payloadB64: string;
  signatureB64: string;
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  headerParseError?: string;
  payloadParseError?: string;
}

/** Standard base64url alphabet. RFC 7515 §2. */
const BASE64URL_RE = /^[A-Za-z0-9_-]*$/;

/**
 * Decode a base64url string. Unlike `atob`, this tolerates URLs and the
 * `-_` alphabet; we add padding back manually so `atob` accepts the input.
 */
function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  try {
    if (typeof atob === 'function') {
      return atob(padded + pad);
    }
    // No atob? The lab is browser-only, so we surface a clear error
    // rather than silently returning an empty string.
    throw new Error('No base64 decoder available in this environment.');
  } catch (e) {
    // Re-throw with context so the validator can report a precise issue.
    if (e instanceof Error && e.message.startsWith('No base64')) throw e;
    return '';
  }
}

/**
 * Decode a JWS compact serialization into its three base64url-encoded
 * segments plus the parsed header and payload (if structurally valid).
 */
export function decodeJws(raw: string): DecodedJws {
  const trimmed = (raw || '').trim();
  const parts = trimmed.split('.');
  const result: DecodedJws = {
    raw: trimmed,
    headerB64: parts[0] ?? '',
    payloadB64: parts[1] ?? '',
    signatureB64: parts[2] ?? '',
    header: null,
    payload: null,
  };

  if (parts.length !== 3) {
    return result;
  }

  // Header
  if (result.headerB64) {
    if (!BASE64URL_RE.test(result.headerB64)) {
      result.headerParseError = 'Header contains non-base64url characters (likely standard base64 with `+`/`/` or `=` padding).';
    } else {
      try {
        result.header = JSON.parse(decodeBase64Url(result.headerB64));
      } catch (e) {
        result.headerParseError = (e as Error).message;
      }
    }
  }

  // Payload
  if (result.payloadB64) {
    if (!BASE64URL_RE.test(result.payloadB64)) {
      result.payloadParseError = 'Payload contains non-base64url characters.';
    } else {
      try {
        result.payload = JSON.parse(decodeBase64Url(result.payloadB64));
      } catch (e) {
        result.payloadParseError = (e as Error).message;
      }
    }
  }

  return result;
}

/**
 * Required and conditionally-required fields for an AReq message,
 * per EMVCo Table A.1 / B.1.
 */
const REQUIRED_AREQ_FIELDS: { field: string; specRef: string; note?: string }[] = [
  { field: 'messageType', specRef: 'Table A.1' },
  { field: 'messageVersion', specRef: 'Table A.1' },
  { field: 'threeDSServerTransID', specRef: 'Table A.1' },
  { field: 'threeDSRequestorID', specRef: 'Table A.1' },
  { field: 'threeDSRequestorName', specRef: 'Table A.1' },
  { field: 'threeDSRequestorURL', specRef: 'Table A.1' },
  { field: 'deviceChannel', specRef: 'Table A.1' },
  { field: 'acctNumber', specRef: 'Table A.1' },
  { field: 'purchaseAmount', specRef: 'Table A.1' },
  { field: 'purchaseCurrency', specRef: 'Table A.1' },
  { field: 'purchaseExponent', specRef: 'Table A.1' },
  { field: 'threeDSCompInd', specRef: 'Table A.1' },
  { field: 'browserAcceptHeader', specRef: 'Table B.1', note: 'Required for deviceChannel=02 (Browser).' },
  { field: 'browserIP', specRef: 'Table B.1' },
  { field: 'browserJavaEnabled', specRef: 'Table B.1' },
  { field: 'browserJavaScriptEnabled', specRef: 'Table B.1' },
  { field: 'browserLanguage', specRef: 'Table B.1' },
  { field: 'browserColorDepth', specRef: 'Table B.1' },
  { field: 'browserScreenHeight', specRef: 'Table B.1' },
  { field: 'browserScreenWidth', specRef: 'Table B.1' },
  { field: 'browserTZ', specRef: 'Table B.1' },
  { field: 'browserUserAgent', specRef: 'Table B.1' },
];

const REQUIRED_ARES_FIELDS: { field: string; specRef: string; note?: string }[] = [
  { field: 'messageType', specRef: 'Table A.1' },
  { field: 'messageVersion', specRef: 'Table A.1' },
  { field: 'threeDSServerTransID', specRef: 'Table A.1' },
  { field: 'dsTransID', specRef: 'Table A.1' },
  { field: 'transStatus', specRef: 'Table A.1' },
  { field: 'acsTransID', specRef: 'Table B.2' },
  { field: 'messageExtension', specRef: 'Table B.2', note: 'May be omitted if there are no message extensions.' },
];

const VALID_TRANS_STATUS = ['Y', 'A', 'N', 'U', 'R', 'C', 'D', 'I', 'S'] as const;
const VALID_DEVICE_CHANNEL = ['01', '02', '03'] as const;
const VALID_THREEDS_COMP_IND = ['Y', 'N', 'U'] as const;
const SUPPORTED_VERSIONS = ['2.1.0', '2.2.0', '2.3.1'] as const;

/**
 * Validate a (possibly raw or JWS-encoded) AReq or ARes payload.
 * Returns a list of issues ordered critical → info.
 */
export function validate3dsMessage(raw: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    issues.push({
      field: 'input',
      severity: 'info',
      message: 'Paste a JWS or JSON payload above to see structural validation issues.',
      specRef: '—',
    });
    return issues;
  }

  // === Phase 1: JWS structural checks ===
  const looksLikeJws = trimmed.startsWith('eyJ') || trimmed.split('.').length === 3;

  if (looksLikeJws) {
    if (trimmed.split('.').length !== 3) {
      issues.push({
        field: 'jws',
        severity: 'critical',
        message: 'JWS compact serialization must have exactly 3 dot-separated segments (header.payload.signature).',
        specRef: '§3.7 / RFC 7515 §3.1',
      });
      return issues;
    }
    const decoded = decodeJws(trimmed);
    if (decoded.headerParseError) {
      issues.push({
        field: 'jws.header',
        severity: 'high',
        message: `Could not parse JWS header as JSON: ${decoded.headerParseError}`,
        specRef: 'RFC 7515 §4.1.1',
        suggestion: 'Verify the header is base64url-encoded JSON.',
      });
    }
    if (decoded.payloadParseError) {
      issues.push({
        field: 'jws.payload',
        severity: 'high',
        message: `Could not parse JWS payload as JSON: ${decoded.payloadParseError}`,
        specRef: 'RFC 7515 §4.1.2',
        suggestion: 'Verify the payload is base64url-encoded JSON.',
      });
    }
    if (!decoded.signatureB64) {
      issues.push({
        field: 'jws.signature',
        severity: 'critical',
        message: 'Missing signature segment. A 3DS JWS MUST be a 3-part compact serialization.',
        specRef: '§3.7',
      });
    } else if (!BASE64URL_RE.test(decoded.signatureB64)) {
      issues.push({
        field: 'jws.signature.encoding',
        severity: 'high',
        message: 'Signature contains non-base64url characters (likely standard base64 with `+`/`/` or `=` padding).',
        specRef: 'RFC 7515 §2',
        suggestion: 'Strip `=` padding and translate `+`→`-`, `/`→`_`.',
      });
    }
    if (decoded.header) {
      const h = decoded.header;
      if (!h.alg) {
        issues.push({
          field: 'jws.header.alg',
          severity: 'critical',
          message: 'JWS header is missing the required `alg` (algorithm) parameter.',
          specRef: 'RFC 7515 §4.1.1',
        });
      }
      if (!h.typ) {
        issues.push({
          field: 'jws.header.typ',
          severity: 'medium',
          message: 'JWS header is missing `typ` (type). EMVCo recommends `JOSE` or `JWT`.',
          specRef: '§3.7',
        });
      }
    }
    if (decoded.payload) {
      // Recurse with the decoded payload as JSON.
      const inner = validatePlainPayload(decoded.payload);
      issues.push(...inner);
    }
    return issues.sort(severityOrder);
  }

  // === Phase 2: raw JSON path ===
  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(trimmed);
  } catch (e) {
    issues.push({
      field: 'input',
      severity: 'critical',
      message: `Input is neither a JWS nor valid JSON: ${(e as Error).message}`,
      specRef: '—',
    });
    return issues;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    issues.push({
      field: 'input',
      severity: 'critical',
      message: 'Top-level value must be a JSON object.',
      specRef: '—',
    });
    return issues;
  }
  const inner = validatePlainPayload(payload);
  return inner.sort(severityOrder);
}

function validatePlainPayload(payload: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const messageType = typeof payload.messageType === 'string' ? payload.messageType : '';
  const messageVersion = typeof payload.messageVersion === 'string' ? payload.messageVersion : '';

  // Version check
  if (!messageVersion) {
    issues.push({
      field: 'messageVersion',
      severity: 'high',
      message: 'Missing `messageVersion`. Every 3DS message must declare its protocol version.',
      specRef: 'Table A.1',
    });
  } else if (!SUPPORTED_VERSIONS.includes(messageVersion as typeof SUPPORTED_VERSIONS[number])) {
    issues.push({
      field: 'messageVersion',
      severity: 'medium',
      message: `messageVersion "${messageVersion}" is not one of the supported versions (${SUPPORTED_VERSIONS.join(', ')}).`,
      specRef: 'Table A.1',
    });
  }

  // Message-type-specific required fields
  if (messageType === 'AReq') {
    for (const req of REQUIRED_AREQ_FIELDS) {
      if (!(req.field in payload) || payload[req.field] === undefined || payload[req.field] === null || payload[req.field] === '') {
        issues.push({
          field: req.field,
          severity: req.field === 'messageType' || req.field === 'messageVersion' || req.field === 'threeDSServerTransID' ? 'critical' : 'high',
          message: `Missing required AReq field \`${req.field}\`${req.note ? ` (${req.note})` : ''}.`,
          specRef: req.specRef,
        });
      }
    }
    // Enumerated checks
    if (typeof payload.deviceChannel === 'string' && !VALID_DEVICE_CHANNEL.includes(payload.deviceChannel as typeof VALID_DEVICE_CHANNEL[number])) {
      issues.push({
        field: 'deviceChannel',
        severity: 'high',
        message: `deviceChannel "${payload.deviceChannel}" is not one of the valid values (01, 02, 03).`,
        specRef: 'Table A.1',
      });
    }
    if (typeof payload.threeDSCompInd === 'string' && !VALID_THREEDS_COMP_IND.includes(payload.threeDSCompInd as typeof VALID_THREEDS_COMP_IND[number])) {
      issues.push({
        field: 'threeDSCompInd',
        severity: 'high',
        message: `threeDSCompInd "${payload.threeDSCompInd}" is not one of the valid values (Y, N, U).`,
        specRef: 'Table A.1',
      });
    }
  } else if (messageType === 'ARes') {
    for (const req of REQUIRED_ARES_FIELDS) {
      if (!(req.field in payload) || payload[req.field] === undefined || payload[req.field] === null || payload[req.field] === '') {
        issues.push({
          field: req.field,
          severity: 'high',
          message: `Missing required ARes field \`${req.field}\`.`,
          specRef: req.specRef,
        });
      }
    }
    if (typeof payload.transStatus === 'string' && !VALID_TRANS_STATUS.includes(payload.transStatus as typeof VALID_TRANS_STATUS[number])) {
      issues.push({
        field: 'transStatus',
        severity: 'high',
        message: `transStatus "${payload.transStatus}" is not one of the valid values (Y, A, N, U, R, C, D, I, S).`,
        specRef: 'Table A.1',
      });
    }
    // ARes in 2.1.0: I and S are not yet defined. I and S were added in 2.3.0.
    if (payload.transStatus === 'I' || payload.transStatus === 'S') {
      if (messageVersion === '2.1.0') {
        issues.push({
          field: 'transStatus',
          severity: 'medium',
          message: `transStatus = "${payload.transStatus}" was added in EMV 3DS v2.3.0 and is not valid in messageVersion "${messageVersion}".`,
          specRef: '§3.3 / 2.3.0 release notes',
          suggestion: 'Either upgrade messageVersion to ≥ 2.3.0, or use a different transStatus value.',
        });
      }
    }
  } else if (!messageType) {
    issues.push({
      field: 'messageType',
      severity: 'critical',
      message: 'Missing `messageType`. Expected one of: AReq, ARes, CReq, CRes, PReq, PRes, RReq, RRes, Erro.',
      specRef: 'Table A.1',
    });
  } else if (messageType === 'Erro') {
    issues.push({
      field: 'messageType',
      severity: 'info',
      message: 'Detected an Error Message (messageType=Erro). Verify errorCode (Table A.10) and errorComponent (A/D/S) are present.',
      specRef: '§A.9',
    });
  } else if (!['CReq', 'CRes', 'PReq', 'PRes', 'RReq', 'RRes', 'Erro'].includes(messageType)) {
    issues.push({
      field: 'messageType',
      severity: 'high',
      message: `Unrecognized messageType "${messageType}". Expected AReq, ARes, CReq, CRes, PReq, PRes, RReq, RRes, or Erro.`,
      specRef: 'Table A.1',
    });
  }

  // ThreeDSServerTransID format: UUID v4
  if (typeof payload.threeDSServerTransID === 'string') {
    const t = payload.threeDSServerTransID;
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4.test(t)) {
      issues.push({
        field: 'threeDSServerTransID',
        severity: 'low',
        message: 'threeDSServerTransID does not match UUID v4 format. EMVCo requires UUID v4 per [Req 81].',
        specRef: '§A.5 / [Req 81]',
      });
    }
  }

  // purchaseAmount should be numeric string
  if (typeof payload.purchaseAmount === 'string' && !/^\d+$/.test(payload.purchaseAmount)) {
    issues.push({
      field: 'purchaseAmount',
      severity: 'medium',
      message: 'purchaseAmount must be a numeric string of minor units (e.g. "27998" for $279.98).',
      specRef: 'Table A.1',
    });
  } else if (typeof payload.purchaseAmount === 'number') {
    issues.push({
      field: 'purchaseAmount',
      severity: 'medium',
      message: 'purchaseAmount must be a string, not a number. JSON serialization of numbers may lose precision.',
      specRef: 'Table A.1',
    });
  }

  return issues;
}

function severityOrder(a: ValidationIssue, b: ValidationIssue): number {
  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return order[a.severity] - order[b.severity];
}

/**
 * Render a payload as a copy-pasteable cURL command. This is what an
 * integration engineer actually pastes into their sandbox when they
 * want to manually exercise an AReq or ARes endpoint.
 */
export function toCurl(rawPayload: string, endpoint: string): string {
  const trimmed = rawPayload.trim();
  const isJws = trimmed.split('.').length === 3;
  if (isJws) {
    return `curl -X POST '${endpoint || 'https://3dss.example/areq'}' \\\n  -H 'Content-Type: application/jose' \\\n  --data '${trimmed}'`;
  }
  return `curl -X POST '${endpoint || 'https://3dss.example/areq'}' \\\n  -H 'Content-Type: application/json' \\\n  --data '${trimmed.replace(/'/g, "'\\''")}'`;
}
