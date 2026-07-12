import { createExternalStore } from './createStore';
import type { Scenario, FlowStep, StepGroupId, ProtocolVersion } from '../types';
import { FLOW_STEPS, STEP_GROUPS } from '../data/flowData';

export type PlaySpeed = 800 | 1500 | 2500 | 5000;

export interface FlowState {
  scenario: Scenario;
  currentStepIndex: number;
  hiddenGroups: StepGroupId[];
  hiddenParticipantCount: number;
  isPlaying: boolean;
  playSpeed: PlaySpeed;
  activeSteps: FlowStep[];
  activeGroupIds: StepGroupId[];
}

/**
 * Numeric ordering for protocol version comparison. Higher = newer.
 * Adding a new version here automatically enables version-aware filtering
 * for any step group that sets `introducedIn`.
 */
const VERSION_ORDER: Record<ProtocolVersion, number> = {
  '2.1.0': 1,
  '2.2.0': 2,
  '2.3.1': 3,
};

function isStepGroupAvailableForVersion(groupId: StepGroupId, version: ProtocolVersion): boolean {
  const group = STEP_GROUPS.find((g) => g.id === groupId);
  if (!group || !group.introducedIn) return true;
  return VERSION_ORDER[version] >= VERSION_ORDER[group.introducedIn];
}

function deriveActiveSteps(scenario: Scenario, hiddenGroups: Set<StepGroupId>): FlowStep[] {
  return FLOW_STEPS.filter(
    (step) =>
      step.isActive(scenario) &&
      (!step.groupId || !hiddenGroups.has(step.groupId)) &&
      (!step.groupId || isStepGroupAvailableForVersion(step.groupId, scenario.protocolVersion))
  );
}

function deriveActiveGroupIds(activeSteps: FlowStep[]): StepGroupId[] {
  const ids = new Set<StepGroupId>();
  activeSteps.forEach((s) => s.groupId && ids.add(s.groupId));
  // Preserve canonical ordering from STEP_GROUPS
  return STEP_GROUPS.map((g) => g.id).filter((id) => ids.has(id));
}

const DEFAULT_SCENARIO: Scenario = {
  protocolVersion: '2.3.1',
  methodPath: 'executed',
  dsRouting: 'normal',
  transStatus: 'Y',
  challengeOutcome: 'success',
  repeatChallenge: false,
  errorPath: 'none',
  challengePreference: '01',
  challengeMandated: 'N',
  challengePresentation: 'html',
};

const initial: FlowState = {
  scenario: DEFAULT_SCENARIO,
  currentStepIndex: 0,
  hiddenGroups: [],
  hiddenParticipantCount: 0,
  isPlaying: false,
  playSpeed: 1500,
  activeSteps: deriveActiveSteps(DEFAULT_SCENARIO, new Set()),
  activeGroupIds: deriveActiveGroupIds(deriveActiveSteps(DEFAULT_SCENARIO, new Set())),
};

export const flowStore = createExternalStore<FlowState>(initial);

function rebuild(scenario: Scenario, hiddenGroups: StepGroupId[], currentStepIndex: number): Partial<FlowState> {
  const hiddenSet = new Set(hiddenGroups);
  const activeSteps = deriveActiveSteps(scenario, hiddenSet);
  const activeGroupIds = deriveActiveGroupIds(activeSteps);
  const clampedIndex = activeSteps.length === 0
    ? 0
    : Math.min(currentStepIndex, activeSteps.length - 1);
  return { scenario, hiddenGroups, activeSteps, activeGroupIds, currentStepIndex: clampedIndex };
}

export const flowActions = {
  setScenario: (scenario: Scenario) => {
    flowStore.setState((s) => rebuild(scenario, s.hiddenGroups, s.currentStepIndex));
  },
  /**
   * Mutate a single scenario field while preserving the others. Useful
   * for individual controls (e.g. the version toggle) that should not
   * require the caller to spread the entire scenario.
   */
  patchScenario: (patch: Partial<Scenario>) => {
    flowStore.setState((s) => rebuild({ ...s.scenario, ...patch }, s.hiddenGroups, s.currentStepIndex));
  },
  setCurrentStepIndex: (idx: number) => {
    flowStore.setState((s) => {
      const max = Math.max(0, s.activeSteps.length - 1);
      return { currentStepIndex: Math.min(Math.max(0, idx), max) };
    });
  },
  nextStep: () => {
    flowStore.setState((s) => {
      if (s.currentStepIndex >= s.activeSteps.length - 1) {
        return { isPlaying: false, currentStepIndex: s.activeSteps.length - 1 };
      }
      return { currentStepIndex: s.currentStepIndex + 1 };
    });
  },
  prevStep: () => {
    flowStore.setState((s) => ({ currentStepIndex: Math.max(0, s.currentStepIndex - 1) }));
  },
  reset: () => {
    flowStore.setState({ currentStepIndex: 0, isPlaying: false });
  },
  togglePlay: () => {
    flowStore.setState((s) => ({ isPlaying: !s.isPlaying }));
  },
  setPlaySpeed: (speed: PlaySpeed) => {
    flowStore.setState({ playSpeed: speed });
  },
  toggleGroup: (groupId: StepGroupId) => {
    flowStore.setState((s) => {
      const hidden = s.hiddenGroups.includes(groupId)
        ? s.hiddenGroups.filter((g) => g !== groupId)
        : [...s.hiddenGroups, groupId];
      return rebuild(s.scenario, hidden, s.currentStepIndex);
    });
  },
  showAllGroups: () => {
    flowStore.setState((s) => rebuild(s.scenario, [], s.currentStepIndex));
  },
  hideAllGroups: () => {
    flowStore.setState((s) => {
      const all = s.activeGroupIds;
      return rebuild(s.scenario, [...all], s.currentStepIndex);
    });
  },
  incrementHiddenParticipants: () => {
    flowStore.setState((s) => ({ hiddenParticipantCount: s.hiddenParticipantCount + 1 }));
  },
  hydrate: (partial: { scenario?: Scenario; currentStepIndex?: number; hiddenGroups?: StepGroupId[] }) => {
    flowStore.setState((s) => {
      const scenario = partial.scenario ?? s.scenario;
      const hiddenGroups = partial.hiddenGroups ?? s.hiddenGroups;
      const currentStepIndex = partial.currentStepIndex ?? s.currentStepIndex;
      return rebuild(scenario, hiddenGroups, currentStepIndex);
    });
  },
};

export { DEFAULT_SCENARIO };
