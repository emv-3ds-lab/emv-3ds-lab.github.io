/**
 * Versioned payload registry types.
 *
 * This module is the single source of truth for the shape and provenance of
 * synthetic 3DS message payloads. The lab owns the EMV 3DS v2.3.1 Core Spec
 * verbatim; for v2.1.0 and v2.2.0 the data is sourced from the comparison
 * `3DSv2-api-documentation` repository (see `LICENSES/EMVCo-notice.md` for the
 * chain-of-custody posture) and every field is annotated with the source
 * that justified its inclusion.
 *
 * No normative prose from EMVCo is reproduced here. Field *names* and the
 * controlled-vocabulary *enumerations* are part of the protocol's public
 * message format and are not copyrightable expression; the descriptions in
 * the registry are paraphrases.
 */

import type { ProtocolVersion, Scenario } from '../../types';

/**
 * Re-export `MessageType` from the canonical types module. The lab-wide
 * type lives in `src/types.ts` to avoid a circular import with this
 * module (the registry re-imports `MessageType` everywhere).
 */
export type { MessageType } from '../../types';
import type { MessageType } from '../../types';

/** The 3DS versions for which the lab ships a hand-built payload template. */
export type SupportedPayloadVersion = Extract<ProtocolVersion, '2.1.0' | '2.2.0' | '2.3.1'>;

/** Ordered by spec release. Used for "since / until" comparisons. */
export const PAYLOAD_VERSION_ORDER: Record<SupportedPayloadVersion, number> = {
  '2.1.0': 1,
  '2.2.0': 2,
  '2.3.1': 3,
};

/**
 * Where a field's inclusion was justified from. The non-`emvco` sources are
 * kept distinct so the audit trail can be reviewed field-by-field.
 */
export type FieldProvenanceSource =
  | {
      kind: 'emvco';
      ref: string;
      /** Table or section anchor in the EMV 3DS Core Spec the field is defined in. */
      table?: string;
    }
  | {
      kind: 'comparison';
      ref: string;
      /** Path within `comparison/3DSv2-api-documentation/` that lists the field. */
      path: string;
    }
  | {
      kind: 'research';
      ref: string;
      /** Internal note or reasoning that justifies a synthetic value. */
      note: string;
    };

/**
 * The provenance record attached to each field in the registry. We capture
 * `sinceVersion` and `untilVersion` so consumers can assert that a wire
 * payload conforms to a given spec version.
 */
export interface FieldProvenance {
  /** Canonical field name as it appears in the protocol message. */
  field: string;
  /** Earliest version in which the field is part of the message. */
  sinceVersion: SupportedPayloadVersion;
  /** Last version in which the field still uses the recorded name. */
  untilVersion?: SupportedPayloadVersion;
  /**
   * If the field was renamed, the *new* field name introduced in
   * `sinceVersion`. The old name is captured in `renamedFrom`.
   */
  renamedTo?: string;
  /** If the field is the result of a rename, the previous field name. */
  renamedFrom?: string;
  /** Whether the field's type or cardinality changed at `sinceVersion`. */
  typeChanged?: boolean;
  /** Spec table or section the field is defined in. */
  emvcoRef: string;
  /** The chain of sources that justify the field's presence and shape. */
  sources: FieldProvenanceSource[];
  /**
   * Short researcher-facing description. Must be a paraphrase, not a
   * verbatim EMVCo field definition.
   */
  description: string;
}

/** A payload factory: a function that builds a synthetic message body. */
export type PayloadBuilder = (scenario: Scenario) => Record<string, unknown>;

/** A versioned payload record pairs a builder with its provenance. */
export interface VersionedPayload {
  messageType: MessageType;
  version: SupportedPayloadVersion;
  builder: PayloadBuilder;
  /**
   * Field-by-field provenance for every key emitted by the builder. The
   * presence of a key in `fields` asserts that the field is part of the
   * message in `version`; absence asserts that the field MUST NOT be sent
   * in `version`.
   */
  fields: FieldProvenance[];
  /**
   * Transport-level provenance. v2.1.0 messages travel as signed JWTs in
   * many deployments; later versions also support detached JWS. v2.3.1
   * added the split-SDK and default-SDK cases. Used by the JWS inspector
   * to label payloads correctly.
   */
  transport: 'jwt' | 'detached-jws' | 'json-form-post' | 'form-post';
  /**
   * A short note for the lab UI: "non-normative paraphrase", "based on
   * EMV 3DS v2.3.1 Table B.1", etc. Shown next to the payload inspector.
   */
  citation: string;
}

/**
 * Resolve the wire-shape of a single field for a target version, given the
 * full registry. Returns `null` if the field is not part of the message in
 * the target version (e.g. it was added later, or removed earlier).
 */
export function resolveFieldAt(
  field: string,
  version: SupportedPayloadVersion,
  registry: readonly FieldProvenance[],
): FieldProvenance | null {
  const targetRank = PAYLOAD_VERSION_ORDER[version];
  for (const entry of registry) {
    if (entry.field !== field) continue;
    const sinceRank = PAYLOAD_VERSION_ORDER[entry.sinceVersion];
    if (targetRank < sinceRank) continue;
    if (entry.untilVersion) {
      const untilRank = PAYLOAD_VERSION_ORDER[entry.untilVersion];
      if (targetRank > untilRank) continue;
    }
    return entry;
  }
  return null;
}

/**
 * Enumerate every field that should appear on the wire for the given
 * message type and version. Used by the spec-conformance test suite and by
 * the JWS inspector to assert "no extra keys" for a synthetic payload.
 *
 * Accepts a partial registry so tests can filter down to a single
 * message type without reconstructing the full `Record<MessageType, …>`.
 */
export function listFieldsFor(
  messageType: MessageType,
  version: SupportedPayloadVersion,
  registry: Record<string, readonly FieldProvenance[]>,
): FieldProvenance[] {
  const slot = registry[messageType];
  if (!slot) return [];
  return slot.filter((entry) => {
    const rank = PAYLOAD_VERSION_ORDER[version];
    const sinceRank = PAYLOAD_VERSION_ORDER[entry.sinceVersion];
    if (rank < sinceRank) return false;
    if (entry.untilVersion) {
      const untilRank = PAYLOAD_VERSION_ORDER[entry.untilVersion];
      if (rank > untilRank) return false;
    }
    return true;
  });
}
