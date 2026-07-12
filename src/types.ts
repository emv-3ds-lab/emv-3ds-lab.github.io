export type MethodPath = 'reused' | 'executed' | 'unavailable' | 'timeout';
export type DSRouting = 'normal' | 'failure';
export type TransStatus = 'Y' | 'A' | 'N' | 'U' | 'R' | 'C' | 'D' | 'I' | 'S';
export type ProtocolVersion = '2.1.0' | '2.2.0' | '2.3.1';
export type ChallengeOutcome = 'success' | 'failure' | 'cancelled' | 'decoupled' | 'optout' | 'error' | 'invalid_cres';
export type ErrorPath = 'none' | 'cres_invalid' | 'acs_error' | 'browser_timeout';
export type ChallengePreference = '01' | '02' | '03' | '04';
export type ChallengeMandated = 'Y' | 'N';
export type ChallengePresentation = 'html' | 'oob';

export interface Scenario {
  protocolVersion: ProtocolVersion;
  methodPath: MethodPath;
  dsRouting: DSRouting;
  transStatus: TransStatus;
  challengeOutcome: ChallengeOutcome;
  repeatChallenge: boolean;
  errorPath: ErrorPath;
  challengePreference: ChallengePreference;
  challengeMandated: ChallengeMandated;
  challengePresentation: ChallengePresentation;
}

export type ParticipantId = 'CH' | 'BR' | 'RE' | 'S' | 'DS' | 'ACS';

export interface Participant {
  id: ParticipantId;
  name: string;
  fullName: string;
  color: string;
  stroke: string;
  bg: string;
}

/**
 * Step groups are visually banded regions of the sequence diagram that group
 * multiple steps into a single conceptual phase. This makes the complex 3DS
 * flow easier to read.
 */
export type StepGroupId =
  | 'preauth'         // PReq/PRes cache warm-up (out-of-band)
  | 'setup'           // Step 2 — version lookup
  | 'method'          // Step 3/4 — 3DS Method iframe flow
  | 'areq'            // Steps 5–6 — AReq assembly & send
  | 'ds_validation'   // Step 7 — DS validates & routes
  | 'acs_decision'    // Step 8 — ACS risk decision
  | 'ares'            // Steps 9–10 — ARes return
  | 'challenge'       // Steps 10–15 — browser challenge and cardholder interaction
  | 'results'         // Steps 16–21 — RReq/RRes/CRes result exchange
  | 'completion';     // Step 22 — checkout continuation

/**
 * How the Cardholder experiences this step. The 3DS Method iframe flow
 * (steps 3b–4e) is the most opaque to the user; the rest of frictionless
 * is silent on the user's side.
 */
export type UserVisibility = 'visible' | 'silent' | 'hidden';

/**
 * StepGroupMeta provides the visual & semantic metadata for a step group
 * (used to draw the colored band on the canvas and to explain the phase).
 */
export interface StepGroupMeta {
  id: StepGroupId;
  title: string;
  description: string;
  color: string;            // band color
  icon: 'cache' | 'setup' | 'fingerprint' | 'request' | 'route' | 'shield' | 'response' | 'challenge' | 'result' | 'check';
}

export interface FlowStep {
  id: string;
  num: string;
  label: string;
  detail: string;
  /** Plain-English description of what the Cardholder experiences during this step. */
  userExperience?: string;
  /** Why this step exists — the design intent. Helps make the protocol readable. */
  whyItMatters?: string;
  /** Estimated wall-clock time the step takes, used for orientation (e.g. "~5s", "<1s"). */
  approxTime?: string;
  /** Whether the Cardholder can perceive this step. */
  userVisibility?: UserVisibility;
  /** Conceptual group the step belongs to (used for visual banding). */
  groupId?: StepGroupId;
  source: ParticipantId | null; // null for local/internal notes
  target: ParticipantId | null;
  specRef?: string;
  payload?: any; // Mock JSON or object payload
  payloadTitle?: string;
  payloadType?: 'json' | 'form' | 'info';
  isActive: (scenario: Scenario) => boolean;
}

export interface SecurityLensNote {
  /** Relative importance of this step as a research surface. */
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  /** Short threat-model summary for this step. */
  summary: string;
  /** Preconditions or setup requirements before this step can be meaningfully tested. */
  prerequisites?: string[];
  /** Attacker vantage points or control surfaces relevant to this step. */
  attackerPositions?: string[];
  /** Abuse ideas or adversarial paths worth testing. */
  abuseCases: string[];
  /** Protocol fields, browser objects, or UI artifacts most worth instrumenting. */
  artifactFocus?: string[];
  /** Signals a researcher can observe in the browser, logs, or messages. */
  observables: string[];
  /** Specific evidence a researcher should capture while testing. */
  evidenceToCollect?: string[];
  /** Defender-side checks or assertions that should hold. */
  defenderChecks: string[];
  /** Guardrails to avoid over-claiming or misclassifying a benign condition as a vulnerability. */
  falsePositiveGuards?: string[];
  /** Concrete impact if the step's invariants fail. */
  impactIfBroken?: string;
  /** Reporting angle for advisories, audits, or papers. */
  reportingAngle?: string;
  /** Useful spec hooks to cite when writing up findings. */
  specHooks?: string[];
}

/**
 * Domain overview — used when a user clicks on a domain background container.
 * Contains the research-grade view of the domain's role, members, and authority.
 */
export interface DomainOverview {
  id: 'acquirer' | 'interop' | 'issuer';
  title: string;
  subtitle: string;
  members: string[];
  /** Spec section that defines this domain's scope. */
  specSection: string;
  /** What this domain is responsible for. */
  responsibilities: string[];
  /** What this domain depends on / trusts. */
  trustAssumptions: string[];
  /** Things this domain is NOT allowed to do. */
  prohibitions: string[];
  /** Notable protocol features anchored in this domain. */
  notableFeatures: string[];
  /** Color for the overview card accent. */
  color: string;
}

/**
 * Participant overview — used when a user clicks on a participant header
 * or lifeline. Research-grade view of the role, ownership, and capabilities.
 */
export interface ParticipantOverview {
  id: ParticipantId;
  shortName: string;
  fullName: string;
  /** Spec section that defines this participant. */
  specSection: string;
  /** Plain-English role description. */
  role: string;
  /** Things this participant owns. */
  owns: string[];
  /** Things this participant does NOT own. */
  doesNotOwn: string[];
  /** Messages it sends (in our flow). */
  sends: string[];
  /** Messages it receives (in our flow). */
  receives: string[];
  /** ID-spaces this participant is authoritative for. */
  authoritativeIds: string[];
  /** Operational notes a researcher should know. */
  notes: string[];
  /** Color accent. */
  color: string;
  /** Stroke color for borders. */
  stroke: string;
}

/**
 * Step-group overview — used when a user clicks on a step group band.
 * Research-grade view of the entire phase.
 */
export interface StepGroupOverview {
  id: StepGroupId;
  title: string;
  specSection: string;
  summary: string;
  /** What happens, end-to-end, in this phase. */
  whatHappens: string[];
  /** Why this phase exists in the protocol. */
  whyItExists: string;
  /** How long this phase typically takes. */
  typicalDuration: string;
  /** Failure modes for this phase. */
  failureModes: string[];
  /** Key data structures in this phase. */
  keyDataStructures: { name: string; ref: string; description: string }[];
  /** Security considerations. */
  securityNotes: string[];
  color: string;
}

/**
 * Glossary entry — shown in the details panel "Reference" tab.
 */
export interface GlossaryEntry {
  term: string;
  abbreviation?: string;
  definition: string;
  specRef?: string;
  example?: string;
}
