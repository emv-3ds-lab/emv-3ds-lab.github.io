/**
 * Scenario snapshot — a stable, versioned JSON document that captures the
 * full lab state. Unlike the permalink (which encodes state in the URL
 * query string), a snapshot file is meant for git diffs, CI regression
 * tests, and offline sharing.
 *
 * The shape is intentionally explicit (no `any` fields) so that
 * `JSON.parse(stringifiedSnapshot)` can be statically verified by
 * consumers that ingest these files.
 */

import type { Scenario, StepGroupId } from '../types';
import { validateScenario } from './protocolViz';

/** Bump this whenever the snapshot shape changes. */
export const SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface Snapshot {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  capturedAt: string; // ISO 8601
  product: 'emv-3ds-protocol-lab';
  scenario: Scenario;
  currentStepIndex: number;
  hiddenGroups: StepGroupId[];
}

export interface SnapshotParseResult {
  ok: boolean;
  snapshot?: Snapshot;
  /** A list of human-readable warnings (e.g. unknown schemaVersion). */
  warnings: string[];
  /** A list of human-readable errors that prevent the snapshot from being applied. */
  errors: string[];
}

/**
 * Serialize a snapshot to a pretty-printed JSON string. The pretty
 * printing is deliberate: the file is meant to be diffable.
 */
export function serializeSnapshot(input: {
  scenario: Scenario;
  currentStepIndex: number;
  hiddenGroups: StepGroupId[];
}): string {
  const snapshot: Snapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    product: 'emv-3ds-protocol-lab',
    scenario: input.scenario,
    currentStepIndex: input.currentStepIndex,
    hiddenGroups: [...input.hiddenGroups],
  };
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Parse and validate a snapshot JSON string. Returns a structured result
 * so the caller can surface warnings (e.g. forward-compatibility) without
 * throwing.
 */
export function parseSnapshot(raw: string): SnapshotParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    errors.push(`Not valid JSON: ${(e as Error).message}`);
    return { ok: false, errors, warnings };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    errors.push('Top-level value must be a JSON object.');
    return { ok: false, errors, warnings };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.product !== 'emv-3ds-protocol-lab') {
    errors.push(`Snapshot product is "${String(obj.product)}", expected "emv-3ds-protocol-lab". This file was not produced by the EMV 3DS Protocol Lab.`);
    return { ok: false, errors, warnings };
  }

  if (typeof obj.schemaVersion !== 'number') {
    errors.push('Snapshot is missing numeric `schemaVersion`.');
    return { ok: false, errors, warnings };
  }
  if (obj.schemaVersion > SNAPSHOT_SCHEMA_VERSION) {
    warnings.push(`Snapshot schemaVersion is ${obj.schemaVersion}, which is newer than this build's schemaVersion (${SNAPSHOT_SCHEMA_VERSION}). Unknown fields will be ignored.`);
  }

  if (!obj.scenario || typeof obj.scenario !== 'object') {
    errors.push('Snapshot is missing a `scenario` object.');
    return { ok: false, errors, warnings };
  }

  // === Validate the embedded Scenario BEFORE we try to use it.
  // === Without this, a snapshot like `{ scenario: { protocolVersion: '2.3.1' } }`
  // === is accepted, and downstream calls like `step.isActive(scenario)` silently
  // === return false because `scenario.transStatus` is undefined. The user
  // === then sees an empty canvas with no explanation.
  const scenarioErrors = validateScenario(obj.scenario);
  if (scenarioErrors.length > 0) {
    errors.push(
      `Snapshot scenario is malformed: ${scenarioErrors.join(' ')}`
    );
    return { ok: false, errors, warnings };
  }

  if (typeof obj.currentStepIndex !== 'number' || obj.currentStepIndex < 0) {
    warnings.push('Snapshot currentStepIndex is missing or invalid; defaulting to 0 on apply.');
  }

  if (!Array.isArray(obj.hiddenGroups)) {
    warnings.push('Snapshot hiddenGroups is missing or invalid; defaulting to [].');
  }

  return {
    ok: errors.length === 0,
    snapshot: {
      schemaVersion: obj.schemaVersion as typeof SNAPSHOT_SCHEMA_VERSION,
      capturedAt: typeof obj.capturedAt === 'string' ? obj.capturedAt : new Date().toISOString(),
      product: 'emv-3ds-protocol-lab',
      scenario: obj.scenario as Scenario,
      currentStepIndex: typeof obj.currentStepIndex === 'number' ? obj.currentStepIndex : 0,
      hiddenGroups: Array.isArray(obj.hiddenGroups) ? (obj.hiddenGroups as StepGroupId[]) : [],
    },
    warnings,
    errors,
  };
}

/**
 * Trigger a browser download of a snapshot file. Uses a temporary
 * Blob URL and a synthetic anchor element — no third-party deps.
 */
export function downloadSnapshot(snapshotJson: string, filename = 'emv-3ds-lab-snapshot.json'): void {
  const blob = new Blob([snapshotJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
