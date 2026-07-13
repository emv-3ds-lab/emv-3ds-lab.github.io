/**
 * Canonical implementations of payload-shaping helpers used by both the
 * main `App.tsx` and the `DetailsPanel` inspector. Keeping them here
 * (rather than duplicated inline) means the spec-accurate version is
 * the one that ships, and the two views never drift apart.
 */

import type { FlowStep, ProtocolVersion, Scenario, StepGroupMeta } from '../types';
import { getPayload } from '../data/payloads';

export interface CorrelationEntry {
  key: string;
  value: string;
  source: 'payload' | 'body' | 'decodedData' | 'fields';
}

export interface ScenarioBranchMeta {
  branchId: string;
  label: string;
  summary: string;
  lane: 'frictionless' | 'challenge' | 'failure' | 'decoupled' | 'info' | 'spc';
  branchKind: 'happy' | 'alternative' | 'terminal' | 'async';
}

export interface VersionDiffSummary {
  compareVersion: ProtocolVersion;
  added: StepGroupMeta[];
  removed: StepGroupMeta[];
  unchanged: StepGroupMeta[];
}

export const PROTOCOL_VERSIONS: ProtocolVersion[] = ['2.1.0', '2.2.0', '2.3.1', '2.4.0'];

const VERSION_ORDER: Record<ProtocolVersion, number> = {
  '2.1.0': 1,
  '2.2.0': 2,
  '2.3.1': 3,
  '2.4.0': 4,
};

const CORRELATION_KEYS = [
  'messageType',
  'messageVersion',
  'threeDSServerTransID',
  'dsTransID',
  'acsTransID',
  'sdkTransID',
  'resultsStatus',
  'transStatus',
  'challengeCancel',
  'threeDSCompInd',
  'threeDSRequestorChallengeInd',
  'acsChallengeMandated',
  'acsRenderingType',
  'acsDecConInd',
  'authenticationValue',
  'eci',
  'cavv',
  'xid',
  'errorCode',
  'errorComponent',
];

/**
 * Resolve a FlowStep's payload to a JSON object for a given scenario.
 *
 * Resolution order:
 *   1. If `step.payload` is a function, call it with the scenario and
 *      deep-copy the result so downstream mutations cannot leak across
 *      re-renders.
 *   2. If `step.payload` is an object, deep-copy it.
 *   3. If neither is set but `step.messageType` is set, build the
 *      payload from the versioned registry at
 *      `src/data/payloads/index.ts`. The active protocol version is
 *      taken from `scenario.protocolVersion`.
 *   4. Otherwise, return null.
 *
 * After materialising the payload, the function overlays scenario-driven
 * fields (transStatus, threeDSCompInd, resultsStatus) on top so the
 * inspector always reflects the current scenario.
 */
export function getDynamicPayload(step: FlowStep, scenario: Scenario): Record<string, unknown> | null {
  let payload: Record<string, unknown> | null = null;

  if (typeof step.payload === 'function') {
    const built = (step.payload as (s: Scenario) => Record<string, unknown>)(scenario);
    payload = JSON.parse(JSON.stringify(built)) as Record<string, unknown>;
  } else if (step.payload && typeof step.payload === 'object') {
    payload = JSON.parse(JSON.stringify(step.payload)) as Record<string, unknown>;
  } else if (step.messageType) {
    payload = getPayload(step.messageType, scenario);
  }

  if (!payload) return null;

  if (payload.transStatus !== undefined) payload.transStatus = scenario.transStatus;

  const body = payload.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    if ((body as Record<string, unknown>).transStatus !== undefined) {
      (body as Record<string, unknown>).transStatus = scenario.transStatus;
    }
  }

  const threeDSCompInd =
    scenario.methodPath === 'reused' || scenario.methodPath === 'executed'
      ? 'Y'
      : scenario.methodPath === 'unavailable'
        ? 'U'
        : 'N';

  if (payload.threeDSCompInd !== undefined) payload.threeDSCompInd = threeDSCompInd;
  if (body && typeof body === 'object' && !Array.isArray(body) && (body as Record<string, unknown>).threeDSCompInd !== undefined) {
    (body as Record<string, unknown>).threeDSCompInd = threeDSCompInd;
  }

  const challengeResult =
    scenario.challengeOutcome === 'success'
      ? 'Y'
      : scenario.challengeOutcome === 'decoupled'
        ? 'D'
        : 'N';

  if (step.id === 'step_17' && payload.transStatus !== undefined) payload.transStatus = challengeResult;

  if ((step.id === 'step_18' || step.id === 'step_19') && payload.resultsStatus !== undefined) {
    payload.resultsStatus = scenario.challengeOutcome === 'decoupled' ? '04' : '01';
  }

  return payload;
}

export function stringifyPayloadForInspector(
  payload: Record<string, unknown> | null,
  payloadType: FlowStep['payloadType'],
): string {
  if (!payload) return '';

  if (payloadType === 'form') {
    const fields = payload.fields;
    if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
      return Object.entries(fields as Record<string, unknown>)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join('&');
    }
  }

  return JSON.stringify(payload, null, 2);
}

export function extractCorrelationEntries(
  payload: Record<string, unknown> | null,
  limit = 8,
): CorrelationEntry[] {
  if (!payload) return [];

  const candidates: Array<{ source: CorrelationEntry['source']; value: Record<string, unknown> }> = [
    { source: 'payload', value: payload },
  ];

  (['body', 'decodedData', 'fields'] as const).forEach((key) => {
    const nested = payload[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      candidates.push({ source: key, value: nested as Record<string, unknown> });
    }
  });

  const seen = new Set<string>();
  const entries: CorrelationEntry[] = [];

  candidates.forEach(({ source, value }) => {
    CORRELATION_KEYS.forEach((key) => {
      const raw = value[key];
      if (raw === undefined || raw === null || raw === '') return;

      const dedupeKey = `${key}:${String(raw)}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      entries.push({
        key,
        value: Array.isArray(raw) ? raw.join(', ') : String(raw),
        source,
      });
    });
  });

  return entries.slice(0, limit);
}

export function getScenarioBranchMeta(scenario: Scenario): ScenarioBranchMeta {
  if (scenario.challengeOutcome === 'optout') {
    return {
      branchId: 'optout',
      label: 'Requestor Opt-out',
      summary: 'Browser challenge is skipped locally and the results loop closes with resultsStatus 02.',
      lane: 'challenge',
      branchKind: 'alternative',
    };
  }

  if (scenario.dsRouting === 'failure') {
    return {
      branchId: 'ds_failure',
      label: 'DS Routing Failure',
      summary: 'Directory Server validation fails before issuer routing, producing an unavailable outcome.',
      lane: 'failure',
      branchKind: 'terminal',
    };
  }

  switch (scenario.transStatus) {
    case 'Y':
      return {
        branchId: 'frictionless_y',
        label: 'Frictionless Authentication',
        summary: 'The issuer authenticates without challenge and the merchant continues with an authenticated result.',
        lane: 'frictionless',
        branchKind: 'happy',
      };
    case 'A':
      return {
        branchId: 'attempts_a',
        label: 'Attempts Outcome',
        summary: 'Authentication is attempted and recorded, but the final state is not a full issuer-authenticated success.',
        lane: 'frictionless',
        branchKind: 'alternative',
      };
    case 'C':
      return {
        branchId: `challenge_${scenario.challengeOutcome}`,
        label: 'Challenge Branch',
        summary:
          scenario.challengeOutcome === 'success'
            ? 'The browser challenge completes successfully and the results loop closes with authenticated state.'
            : scenario.challengeOutcome === 'decoupled'
              ? 'The browser challenge pivots into an asynchronous issuer-controlled decoupled path.'
              : scenario.challengeOutcome === 'invalid_cres'
                ? 'The challenge returns a browser completion artifact that the requestor must reject.'
                : scenario.challengeOutcome === 'error'
                  ? 'The browser challenge ends in an explicit error notification path.'
                  : 'The browser challenge becomes the decisive branch for the transaction outcome.',
        lane: 'challenge',
        branchKind: scenario.challengeOutcome === 'decoupled' ? 'async' : 'alternative',
      };
    case 'D':
      return {
        branchId: 'decoupled_d',
        label: 'Decoupled Authentication',
        summary: 'The issuer moves authentication out of the browser and the requestor waits for the authoritative RReq.',
        lane: 'decoupled',
        branchKind: 'async',
      };
    case 'I':
      return {
        branchId: 'info_only',
        label: 'Information Only',
        summary: 'The issuer returns data useful for risk analysis without authenticating the cardholder.',
        lane: 'info',
        branchKind: 'alternative',
      };
    case 'S':
      return {
        branchId: 'spc_s',
        label: 'SPC / WebAuthn',
        summary: 'The browser path uses Secure Payment Confirmation instead of the standard challenge iframe.',
        lane: 'spc',
        branchKind: 'happy',
      };
    case 'N':
    case 'R':
    case 'U':
      return {
        branchId: `terminal_${scenario.transStatus.toLowerCase()}`,
        label: 'Terminal Negative Outcome',
        summary: 'The protocol reaches a negative or unavailable terminal state and checkout must not treat it as authenticated.',
        lane: 'failure',
        branchKind: 'terminal',
      };
    default:
      return {
        branchId: 'default',
        label: 'Protocol Branch',
        summary: 'Inspect the branch map and the step inspector to understand the active path.',
        lane: 'frictionless',
        branchKind: 'alternative',
      };
  }
}

export function getVersionDiffSummary(
  activeVersion: ProtocolVersion,
  compareVersion: ProtocolVersion | null,
  groups: StepGroupMeta[],
): VersionDiffSummary | null {
  if (!compareVersion || compareVersion === activeVersion) return null;

  const activeRank = VERSION_ORDER[activeVersion];
  const compareRank = VERSION_ORDER[compareVersion];

  const added: StepGroupMeta[] = [];
  const removed: StepGroupMeta[] = [];
  const unchanged: StepGroupMeta[] = [];

  groups.forEach((group) => {
    const introducedRank = VERSION_ORDER[group.introducedIn ?? '2.1.0'];
    const visibleInActive = activeRank >= introducedRank;
    const visibleInCompare = compareRank >= introducedRank;

    if (visibleInActive && !visibleInCompare) added.push(group);
    else if (!visibleInActive && visibleInCompare) removed.push(group);
    else unchanged.push(group);
  });

  return {
    compareVersion,
    added,
    removed,
    unchanged,
  };
}

export function isVersionAtLeast(version: ProtocolVersion, minimum: ProtocolVersion): boolean {
  return VERSION_ORDER[version] >= VERSION_ORDER[minimum];
}

/**
 * Walk a payload shape and return every field name (top-level + common
 * nested containers). Single source of truth used by the Security Lens
 * to derive an artifact-focus list and by the validator to enumerate
 * fields for cross-referencing.
 */
export function extractPayloadFields(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;
  const fields = new Set<string>();

  Object.keys(data).forEach((key) => fields.add(key));

  const nestedCandidates = ['body', 'decodedData', 'fields'] as const;
  for (const key of nestedCandidates) {
    const value = data[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.keys(value as Record<string, unknown>).forEach((nestedKey) => fields.add(nestedKey));
    }
  }

  return Array.from(fields);
}

/**
 * Validate a Scenario object. Returns a list of human-readable errors
 * describing missing or wrong-typed fields. Used by `parseSnapshot` to
 * surface malformed snapshot files before they crash the flow reducer
 * downstream.
 */
export function validateScenario(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['Scenario must be a JSON object.'];
  }
  const obj = value as Record<string, unknown>;
  const errors: string[] = [];
  const required: Array<{ key: keyof Scenario; type: 'string'; values?: readonly string[] }> = [
    { key: 'protocolVersion', type: 'string', values: PROTOCOL_VERSIONS as readonly string[] },
    { key: 'methodPath', type: 'string', values: ['reused', 'executed', 'unavailable', 'timeout'] },
    { key: 'dsRouting', type: 'string', values: ['normal', 'failure'] },
    { key: 'transStatus', type: 'string', values: ['Y', 'A', 'N', 'U', 'R', 'C', 'D', 'I', 'S'] },
    { key: 'challengeOutcome', type: 'string', values: ['success', 'failure', 'cancelled', 'decoupled', 'optout', 'error', 'invalid_cres'] },
    { key: 'errorPath', type: 'string', values: ['none', 'cres_invalid', 'acs_error', 'browser_timeout'] },
    { key: 'challengePreference', type: 'string', values: ['01', '02', '03', '04'] },
    { key: 'challengeMandated', type: 'string', values: ['Y', 'N'] },
    { key: 'challengePresentation', type: 'string', values: ['html', 'oob'] },
  ];

  for (const field of required) {
    const actual = obj[field.key];
    if (typeof actual !== 'string') {
      errors.push(`Scenario.${field.key} is missing or not a string.`);
      continue;
    }
    if (field.values && !field.values.includes(actual)) {
      errors.push(`Scenario.${field.key} = "${actual}" is not one of [${field.values.join(', ')}].`);
    }
  }

  if (typeof obj.repeatChallenge !== 'boolean') {
    errors.push('Scenario.repeatChallenge is missing or not a boolean.');
  }

  return errors;
}
