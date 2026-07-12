import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  Controls as ReactFlowControls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Shield, Sun, Moon, Terminal, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookOpen, Eye, EyeOff, Crosshair, Link2, Sparkles, List, Download, Upload, Info, FileWarning } from 'lucide-react';
import './App.css';

import type { Scenario, FlowStep, StepGroupId, ParticipantId, ProtocolVersion } from './types';
import { PARTICIPANTS, FLOW_STEPS, STEP_GROUPS } from './data/flowData';
import { ParticipantHeaderNode, LifelineAnchorNode, LifelineBottomNode, InternalStepNode, DomainGroupNode, StepGroupBandNode, SwimlaneColumnNode, StepNumberRailNode } from './components/CustomNode';
import { CustomMessageEdge } from './components/CustomEdge';
import { Controls } from './components/Controls';
import { DetailsPanel } from './components/DetailsPanel';
import type { DetailsContext } from './components/DetailsPanel';
import { flowStore, flowActions } from './stores/flowStore';
import { uiStore, uiActions } from './stores/uiStore';
import { EMVCO_DEVICE_FIELDS } from './data/emvcoFingerprint';
import { serializeSnapshot, parseSnapshot, downloadSnapshot } from './utils/snapshot';

/**
 * Re-exported from DetailsPanel for use in onNodeClick handlers.
 * See src/components/DetailsPanel.tsx for the canonical definition.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type { DetailsContext };

// Define static node types for React Flow
const nodeTypes = {
  participantHeader: ParticipantHeaderNode,
  lifelineAnchor: LifelineAnchorNode,
  lifelineBottom: LifelineBottomNode,
  internalStep: InternalStepNode,
  domainContainer: DomainGroupNode,
  stepGroupBand: StepGroupBandNode,
  swimlaneColumn: SwimlaneColumnNode,
  stepNumberRail: StepNumberRailNode,
};

const edgeTypes = {
  messageEdge: CustomMessageEdge,
};

// Spaced center coordinates for each participant lane (widen to 260px gaps for readability)
const X_COORDS = {
  CH: 150,
  BR: 410,
  RE: 670,
  S: 930,
  DS: 1190,
  ACS: 1450
};

// X coordinate for the step-number rail (left margin of the diagram).
const STEP_RAIL_X = -50;

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

type ScenarioPreset = {
  id: string;
  label: string;
  summary: string;
  scenario: Scenario;
};

type SharedAppState = {
  scenario?: Partial<Scenario>;
  currentStepIndex?: number;
  hiddenGroups?: StepGroupId[];
  theme?: 'dark' | 'light' | 'security';
  securityLensEnabled?: boolean;
  scenarioToolbarCollapsed?: boolean;
};

const SCENARIO_PRESETS: ScenarioPreset[] = [
  { id: 'frictionless_y', label: 'Frictionless Y', summary: 'Approval without a visible challenge.', scenario: { ...DEFAULT_SCENARIO, transStatus: 'Y' } },
  { id: 'attempts_a', label: 'Attempts A', summary: 'Attempts flow when full auth is not completed.', scenario: { ...DEFAULT_SCENARIO, transStatus: 'A', methodPath: 'reused' } },
  { id: 'challenge_success', label: 'Challenge Success', summary: 'Interactive challenge that returns success.', scenario: { ...DEFAULT_SCENARIO, transStatus: 'C', challengeOutcome: 'success', challengeMandated: 'Y' } },
  { id: 'challenge_failure', label: 'Challenge Failure', summary: 'Challenge completed but authentication fails.', scenario: { ...DEFAULT_SCENARIO, transStatus: 'C', challengeOutcome: 'failure', challengeMandated: 'Y' } },
  { id: 'decoupled_d', label: 'Decoupled D', summary: 'ACS defers completion into decoupled authentication.', scenario: { ...DEFAULT_SCENARIO, transStatus: 'D', challengeOutcome: 'decoupled', challengePresentation: 'oob' } },
  { id: 'opt_out', label: 'Opt-out', summary: 'Requestor opt-out path with resultsStatus 02.', scenario: { ...DEFAULT_SCENARIO, transStatus: 'C', challengeOutcome: 'optout', challengePreference: '02', challengeMandated: 'Y' } },
  { id: 'info_only', label: 'Info Only', summary: 'Information-only processing path.', scenario: { ...DEFAULT_SCENARIO, transStatus: 'I', methodPath: 'unavailable' } },
  { id: 'spc_s', label: 'SPC S', summary: 'Secure Payment Confirmation success-style branch.', scenario: { ...DEFAULT_SCENARIO, transStatus: 'S', challengePresentation: 'oob' } },
];

const getScenarioSummary = (scenario: Scenario) => {
  if (scenario.challengeOutcome === 'optout') {
    return { title: 'Requestor Opt-out', description: 'Challenge flow ends with requestor opt-out semantics and resultsStatus 02.' };
  }
  switch (scenario.transStatus) {
    case 'Y': return { title: 'Frictionless Success', description: 'ACS approves the transaction without a visible challenge.' };
    case 'A': return { title: 'Attempts Path', description: 'Attempts processing is returned instead of a full success.' };
    case 'N': return { title: 'Authentication Failed', description: 'Authentication was attempted and did not succeed.' };
    case 'U': return { title: 'Unable To Authenticate', description: 'The protocol could not complete a reliable authentication result.' };
    case 'R': return { title: 'Rejected', description: 'ACS rejects the transaction before completion.' };
    case 'C': return { title: 'Challenge Flow', description: 'The flow enters an interactive challenge branch.' };
    case 'D': return { title: 'Decoupled Authentication', description: 'ACS moves the flow into decoupled completion.' };
    case 'I': return { title: 'Information Only', description: 'The request is handled as information-only rather than full authentication.' };
    case 'S': return { title: 'SPC Path', description: 'The branch reflects Secure Payment Confirmation semantics.' };
    default: return { title: 'Protocol Scenario', description: 'Inspect the rendered branch to understand what changed.' };
  }
};

const buildShareUrl = (state: SharedAppState) => {
  const url = new URL(window.location.href);
  url.searchParams.set('state', JSON.stringify(state));
  return url;
};

function AppContent() {
  // Read directly from the external stores. Each store exposes a typed
  // useStore(selector) hook that uses useSyncExternalStore under the hood,
  // so consumers only re-render when the selected slice changes (Object.is).
  // This replaces the prior 11+ useState hooks pattern.
  const scenario = flowStore.useStore((s) => s.scenario);
  const currentStepIndex = flowStore.useStore((s) => s.currentStepIndex);
  const hiddenGroups = flowStore.useStore((s) => s.hiddenGroups);
  const isPlaying = flowStore.useStore((s) => s.isPlaying);
  const playSpeed = flowStore.useStore((s) => s.playSpeed);
  const activeSteps = flowStore.useStore((s) => s.activeSteps);

  const theme = uiStore.useStore((s) => s.theme);
  const isLeftCollapsed = uiStore.useStore((s) => s.isLeftCollapsed);
  const isRightCollapsed = uiStore.useStore((s) => s.isRightCollapsed);
  const isScenarioToolbarCollapsed = uiStore.useStore((s) => s.isScenarioToolbarCollapsed);
  const securityLensEnabled = uiStore.useStore((s) => s.securityLensEnabled);
  const shareCopied = uiStore.useStore((s) => s.shareCopied);
  const detailsContext = uiStore.useStore((s) => s.detailsContext);
  const hasLoadedSharedState = uiStore.useStore((s) => s.hasLoadedSharedState);
  const showListView = uiStore.useStore((s) => s.showListView);

  // Local-only UI: not in any store because nothing else needs it.
  const [isProfilingMounted, setIsProfilingMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  // Snapshot import feedback (transient; not worth putting in the store).
  const [snapshotImportStatus, setSnapshotImportStatus] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);
  const snapshotFileInputRef = useRef<HTMLInputElement>(null);
  const snapshotImportTimerRef = useRef<number | null>(null);

  // Apply theme to the document body.
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Detect prefers-reduced-motion so we can dampen autoplay + animations.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Hydrate state from the shared URL (one-shot on mount).
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawState = params.get('state');
      if (rawState) {
        const parsed = JSON.parse(rawState) as SharedAppState;
        // Merge over the current default so we never end up with an
        // undefined protocolVersion or other required field.
        const mergedScenario: Scenario = parsed.scenario
          ? { ...flowStore.getState().scenario, ...parsed.scenario }
          : flowStore.getState().scenario;
        flowActions.hydrate({
          scenario: mergedScenario,
          currentStepIndex: parsed.currentStepIndex,
          hiddenGroups: parsed.hiddenGroups,
        });
        uiActions.hydrate({
          theme: parsed.theme,
          securityLensEnabled: parsed.securityLensEnabled,
          isScenarioToolbarCollapsed: parsed.scenarioToolbarCollapsed,
        });
      }
    } catch {
      // Ignore malformed shared state; fall back to defaults.
    } finally {
      uiActions.setHasLoadedSharedState(true);
    }
  }, []);

  // When playback advances, if the user is currently viewing the same step,
  // follow playback. If they have selected a different context, leave it.
  useEffect(() => {
    if (detailsContext.kind !== 'step') return;
    const current = activeSteps[currentStepIndex];
    if (!current || current.id === detailsContext.stepId) return;
    if (isPlaying || detailsContext.stepId === 'step_0A') {
      uiActions.setDetailsContext({ kind: 'step', stepId: current.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, isPlaying]);

  // If hiding a phase drops the step list beneath the current index, clamp down.
  useEffect(() => {
    if (activeSteps.length === 0) {
      if (currentStepIndex !== 0) flowActions.setCurrentStepIndex(0);
      return;
    }
    if (currentStepIndex >= activeSteps.length) {
      flowActions.setCurrentStepIndex(activeSteps.length - 1);
    }
  }, [activeSteps.length, currentStepIndex]);

  // Keep detailsContext in sync when activeSteps shrinks.
  useEffect(() => {
    if (
      detailsContext.kind === 'step' &&
      activeSteps.length > 0 &&
      !activeSteps.some((s) => s.id === detailsContext.stepId)
    ) {
      const fallback = activeSteps[Math.min(currentStepIndex, activeSteps.length - 1)];
      if (fallback) {
        uiActions.setDetailsContext({ kind: 'step', stepId: fallback.id });
      }
    }
  }, [activeSteps, detailsContext, currentStepIndex]);

  // A safe fallback step for downstream consumers.
  const fallbackStep: FlowStep | undefined = useMemo(
    () => activeSteps[currentStepIndex] || activeSteps[0] || FLOW_STEPS[0],
    [activeSteps, currentStepIndex]
  );
  const currentStep = fallbackStep;
  const isProfilingActive = !!currentStep && (currentStep.num === '3b' || currentStep.num.startsWith('4'));
  // Mount/unmount the live profiler widget behind a flag so toggling
  // doesn't destroy React state during the active range. We mount it
  // slightly before activation and unmount slightly after, so the
  // animation timers survive a single render frame.
  useEffect(() => {
    if (isProfilingActive) {
      setIsProfilingMounted(true);
      return;
    }
    const t = setTimeout(() => setIsProfilingMounted(false), 400);
    return () => clearTimeout(t);
  }, [isProfilingActive]);
  const activeGroups = useMemo(
    () => STEP_GROUPS.filter((group) => activeSteps.some((step) => step.groupId === group.id)),
    [activeSteps]
  );
  const scenarioPresetId = useMemo(
    () => SCENARIO_PRESETS.find((preset) => JSON.stringify(preset.scenario) === JSON.stringify(scenario))?.id,
    [scenario]
  );
  const scenarioSummary = useMemo(() => getScenarioSummary(scenario), [scenario]);
  const scenarioFacts = useMemo(
    () => [
      { label: 'Version', value: scenario.protocolVersion },
      { label: 'Method', value: scenario.methodPath },
      { label: 'DS', value: scenario.dsRouting },
      { label: 'Challenge', value: scenario.challengePresentation === 'oob' ? 'oob' : 'html' },
      { label: 'Result', value: scenario.transStatus },
      ...(scenario.challengeOutcome === 'optout' ? [{ label: 'resultsStatus', value: '02' }] : []),
    ],
    [scenario]
  );

  // Persist a shareable URL whenever the user mutates state.
  useEffect(() => {
    if (!hasLoadedSharedState) return;
    const url = buildShareUrl({
      scenario,
      currentStepIndex,
      hiddenGroups: [...hiddenGroups],
      theme,
      securityLensEnabled,
      scenarioToolbarCollapsed: isScenarioToolbarCollapsed,
    });
    window.history.replaceState({}, '', url);
  }, [hasLoadedSharedState, scenario, currentStepIndex, hiddenGroups, theme, securityLensEnabled, isScenarioToolbarCollapsed]);

  // Auto-play effect. Honors prefers-reduced-motion by holding the step
  // instead of advancing when the user has the OS-level setting on.
  useEffect(() => {
    if (!isPlaying) return;
    if (prefersReducedMotion) {
      flowActions.togglePlay();
      return;
    }
    const interval = setInterval(() => {
      const s = flowStore.getState();
      if (s.currentStepIndex >= s.activeSteps.length - 1) {
        flowActions.togglePlay();
        return;
      }
      flowActions.nextStep();
    }, playSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, prefersReducedMotion]);

  // Keyboard Navigation Support. Wrapped in useCallback so the listener
  // identity is stable across renders and we don't thrash window event
  // subscriptions.
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement | null)?.isContentEditable) {
      return;
    }
    const len = flowStore.getState().activeSteps.length;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      flowActions.togglePlay();
      flowActions.nextStep();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      flowActions.togglePlay();
      flowActions.prevStep();
    } else if (e.key === ' ') {
      e.preventDefault();
      flowActions.togglePlay();
    } else if (e.key === 'Home') {
      e.preventDefault();
      flowActions.reset();
    } else if (e.key === 'End' && len > 0) {
      e.preventDefault();
      flowActions.setCurrentStepIndex(len - 1);
    } else if (/^[1-8]$/.test(e.key)) {
      // Digit shortcuts jump to scenario presets 1–8. The 8 presets are
      // defined in SCENARIO_PRESETS in a stable order. We dispatch via a
      // ref because the actual `applyScenarioPreset` callback is declared
      // later in the component body and the keydown handler needs to
      // exist before any of those.
      e.preventDefault();
      const idx = Number(e.key) - 1;
      applyScenarioPresetRef.current?.(idx);
    }
  }, []);

  // Ref that lets the keydown handler call into the (later-declared)
  // `applyScenarioPreset` callback. The ref is updated in an effect
  // below so it always points at the latest closure.
  const applyScenarioPresetRef = useRef<(idx: number) => void>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { applyScenarioPresetRef.current = (idx) => {
    const preset = SCENARIO_PRESETS[idx];
    if (preset) {
      flowActions.setScenario(preset.scenario);
      flowActions.reset();
      flowActions.showAllGroups();
      uiActions.setDetailsContext({ kind: 'step', stepId: 'step_0A' });
    }
  }; }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // React Flow instance view fitting
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 350, padding: 0.15 });
    }, 320);
    return () => clearTimeout(timer);
  }, [isLeftCollapsed, isRightCollapsed, activeSteps.length, fitView]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.12 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView]);

  // === Group visibility helpers (delegated to flowActions). ===
  const toggleGroupVisibility = useCallback((groupId: StepGroupId) => {
    flowActions.toggleGroup(groupId);
  }, []);

  const showAllGroups = useCallback(() => {
    flowActions.showAllGroups();
  }, []);

  const hideAllGroups = useCallback(() => {
    flowActions.hideAllGroups();
  }, []);

  const isolateGroup = useCallback((groupId: StepGroupId) => {
    // Hide every other group.
    const all = new Set(flowStore.getState().activeGroupIds);
    all.delete(groupId);
    flowStore.setState((s) => ({ ...s, hiddenGroups: [...all] }));
  }, []);

  // Focus management: when the active step changes, focus its DOM node
  // so keyboard users and screen readers get a focus ring + announcement.
  // We do this by querying the rendered DOM for the data-step-state
  // attribute (set in CustomNode.tsx), which is more robust than holding
  // a React ref because the xyflow node DOM is created by xyflow, not by
  // our React tree.
  const reactFlow = useReactFlow();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const currentNode = document.querySelector(
      '[data-step-state="current"][role="button"]'
    ) as HTMLElement | null;
    if (!currentNode) return;
    currentNode.focus({ preventScroll: true });
    // Make sure the focused node is in the viewport (xyflow v12 does
    // not auto-pan on focus by default). Skip if user is mid-pan/zoom.
    if (!isPlaying) {
      try {
        reactFlow.fitView({ nodes: [{ id: currentNode.getAttribute('data-id') || '' }], padding: 0.18, duration: 280, maxZoom: 1.1 });
      } catch {
        // If fitView fails (no node id available, etc.), silently skip.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  // === Build the graph. We split nodes and edges into two useMemo
  // === invocations so each one returns a stable array reference, not a
  // === fresh wrapper object on every render. xyflow reads these via
  // === its internal store and a stable shape is critical to prevent
  // === re-mounting nodes during reconciliation.
  const graphArgs = useMemo(
    () => ({ scenario, activeSteps, currentStepIndex, theme, currentStep }),
    [scenario, activeSteps, currentStepIndex, theme, currentStep]
  );

  const nodes: Node[] = useMemo(() => {
    const nodesList: Node[] = [];
    const lifelineLength = Math.max(1100, 180 + activeSteps.length * 90);

    const STEP_Y_GAP = 90;
    const STEP_Y_BASE = 140;
    const groupYRange: Record<string, { min: number; max: number; count: number }> = {};
    activeSteps.forEach((step, idx) => {
      if (!step.groupId) return;
      const y = STEP_Y_BASE + idx * STEP_Y_GAP;
      if (!groupYRange[step.groupId]) {
        groupYRange[step.groupId] = { min: y, max: y, count: 0 };
      }
      groupYRange[step.groupId].min = Math.min(groupYRange[step.groupId].min, y);
      groupYRange[step.groupId].max = Math.max(groupYRange[step.groupId].max, y);
      groupYRange[step.groupId].count += 1;
    });

    const visibleGroups = STEP_GROUPS.filter((g) => groupYRange[g.id]?.count > 0);
    const phaseIndexById: Record<string, number> = {};
    visibleGroups.forEach((g, i) => {
      phaseIndexById[g.id] = i + 1;
    });

    const bandX = X_COORDS.CH - 110;
    const bandWidth = X_COORDS.ACS - X_COORDS.CH + 220;

    STEP_GROUPS.forEach((g) => {
      const range = groupYRange[g.id];
      if (!range || range.count === 0) return;
      const y = range.min - 30;
      const height = range.max - range.min + 60;
      nodesList.push({
        id: `stepgroup_${g.id}`,
        type: 'stepGroupBand',
        position: { x: bandX, y },
        data: {
          title: g.title,
          color: g.color,
          width: bandWidth,
          height,
          isCurrent: currentStep?.groupId === g.id,
          phaseIndex: phaseIndexById[g.id] ?? 0,
          stepCount: range.count,
          // Forward both the phase's introducedIn and the active scenario
          // version so the band can render a version diff badge. The
          // store already filtered out groups that are too new for the
          // active version, so this badge is informational and helps
          // readers cross-reference the EMVCo spec.
          introducedIn: g.introducedIn,
          activeVersion: scenario.protocolVersion,
        },
        draggable: false,
        selectable: true,
      });
    });

    nodesList.push({
      id: 'domain_acquirer',
      type: 'domainContainer',
      position: { x: X_COORDS.CH - 110, y: -20 },
      data: {
        title: 'Acquirer Domain',
        subtitle: 'Merchant & 3DS Requestor Environment',
        color: '#2563eb',
        width: X_COORDS.S - X_COORDS.CH + 220,
        height: lifelineLength + 60,
      },
      draggable: false,
      selectable: true,
    });

    nodesList.push({
      id: 'domain_interop',
      type: 'domainContainer',
      position: { x: X_COORDS.DS - 110, y: -20 },
      data: {
        title: 'Interoperability Domain',
        subtitle: 'Payment System Directory Server',
        color: '#8b5cf6',
        width: 220,
        height: lifelineLength + 60,
      },
      draggable: false,
      selectable: true,
    });

    nodesList.push({
      id: 'domain_issuer',
      type: 'domainContainer',
      position: { x: X_COORDS.ACS - 110, y: -20 },
      data: {
        title: 'Issuer Domain',
        subtitle: 'Card Issuer Access Control Server',
        color: '#10b981',
        width: 220,
        height: lifelineLength + 60,
      },
      draggable: false,
      selectable: true,
    });

    const laneWidth = 220;
    PARTICIPANTS.forEach((p) => {
      const isActorActive =
        !!currentStep &&
        (p.id === currentStep.source || p.id === currentStep.target);
      nodesList.push({
        id: `swimlane_${p.id}`,
        type: 'swimlaneColumn',
        position: { x: X_COORDS[p.id] - laneWidth / 2, y: 0 },
        data: {
          stroke: p.stroke,
          bg: p.bg,
          isActive: isActorActive,
          width: laneWidth,
          height: lifelineLength + 80,
          label: p.id,
          fullName: p.fullName,
        },
        draggable: false,
        selectable: false,
      });
    });

    PARTICIPANTS.forEach((p) => {
      const isActorActive = !!currentStep && (p.id === currentStep.source || p.id === currentStep.target);

      nodesList.push({
        id: `header_${p.id}`,
        type: 'participantHeader',
        position: { x: X_COORDS[p.id] - 80, y: 15 },
        data: {
          id: p.id,
          name: p.name,
          fullName: p.fullName,
          color: p.color,
          stroke: p.stroke,
          bg: p.bg,
          isActive: isActorActive,
        },
        draggable: false,
      });

      nodesList.push({
        id: `lifeline_bottom_${p.id}`,
        position: { x: X_COORDS[p.id] - 14, y: lifelineLength - 4 },
        data: {
          label: '',
          color: p.stroke,
          isActive: isActorActive,
        },
        type: 'lifelineBottom',
        draggable: false,
      });
    });

    activeSteps.forEach((step, idx) => {
      const stepY = 140 + idx * 90;
      const isActive = idx <= currentStepIndex;
      const isCurrent = idx === currentStepIndex;
      const isError = /err|invalid/i.test(step.num) || step.id.includes('err') || step.id.includes('invalid');

      const railSource = step.source
        ? PARTICIPANTS.find((p) => p.id === step.source)
        : undefined;
      const railColor = railSource ? railSource.stroke : '#6366f1';
      nodesList.push({
        id: `rail_${step.id}`,
        type: 'stepNumberRail',
        position: { x: STEP_RAIL_X, y: stepY - 18 },
        data: {
          num: step.num,
          label: step.label,
          isActive,
          isCurrent,
          color: railColor,
        },
        draggable: false,
        selectable: false,
        zIndex: 5,
      });

      if (step.source && step.target) {
        const sourcePart = PARTICIPANTS.find(p => p.id === step.source);
        const sourceColor = sourcePart ? sourcePart.stroke : '#6366f1';

        nodesList.push({
          id: `anchor_source_${step.id}`,
          type: 'lifelineAnchor',
          position: { x: X_COORDS[step.source] - 5, y: stepY },
          data: {
            isActive,
            isHighlighted: isCurrent,
            color: sourceColor,
          },
          draggable: false,
        });

        nodesList.push({
          id: `anchor_target_${step.id}`,
          type: 'lifelineAnchor',
          position: { x: X_COORDS[step.target] - 5, y: stepY },
          data: {
            isActive,
            isHighlighted: isCurrent,
            color: sourceColor,
          },
          draggable: false,
        });
      } else if (step.source) {
        const p = PARTICIPANTS.find(part => part.id === step.source);
        const pColor = p ? p.stroke : '#6366f1';
        const boxX = step.source === 'ACS'
          ? X_COORDS[step.source] - 210
          : X_COORDS[step.source] + 20;

        nodesList.push({
          id: `internal_${step.id}`,
          type: 'internalStep',
          position: { x: boxX, y: stepY - 8 },
          data: {
            num: step.num,
            label: step.label,
            isHighlighted: isCurrent,
            isActive,
            color: p?.color || '#1e1b4b',
            stroke: pColor,
            isError,
          },
          draggable: false,
        });

        nodesList.push({
          id: `anchor_source_${step.id}`,
          type: 'lifelineAnchor',
          position: { x: X_COORDS[step.source] - 5, y: stepY },
          data: {
            isActive,
            isHighlighted: isCurrent,
            color: pColor,
          },
          draggable: false,
        });
      }
    });

    return nodesList;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphArgs]);

  const edges: Edge[] = useMemo(() => {
    const edgesList: Edge[] = [];
    const lifelineLength = Math.max(1100, 180 + activeSteps.length * 90);

    PARTICIPANTS.forEach((p) => {
      const isActorActive = !!currentStep && (p.id === currentStep.source || p.id === currentStep.target);
      edgesList.push({
        id: `lifeline_edge_${p.id}`,
        source: `header_${p.id}`,
        target: `lifeline_bottom_${p.id}`,
        type: 'straight',
        zIndex: 1,
        className: isActorActive ? 'active-lifeline' : '',
        style: isActorActive
          ? {
              stroke: p.stroke,
              strokeWidth: 2.5,
              opacity: 1,
              filter: `drop-shadow(0 0 6px ${p.stroke}66)`,
            }
          : {
              stroke: theme === 'dark' ? 'rgba(200, 214, 229, 0.55)' : 'rgba(13, 62, 92, 0.45)',
              strokeWidth: 1.75,
              opacity: 0.85,
            },
        interactionWidth: 0,
        focusable: false,
      });
    });

    activeSteps.forEach((step, idx) => {
      const isActive = idx <= currentStepIndex;
      const isCurrent = idx === currentStepIndex;

      if (!step.source || !step.target) return;
      const sourcePart = PARTICIPANTS.find(p => p.id === step.source);
      const sourceColor = sourcePart ? sourcePart.stroke : '#6366f1';

      const isSourceLeft = X_COORDS[step.source] < X_COORDS[step.target];
      const sourceHandle = isSourceLeft ? 'right' : 'left';
      const targetHandle = isSourceLeft ? 'left' : 'right';

      let fieldsPreview: string[] = [];
      let msgType = '';
      if (step.payload) {
        const keys = Object.keys(step.payload);
        if (step.payloadType === 'form') {
          if (step.payload.decodedData) {
            fieldsPreview = Object.keys(step.payload.decodedData);
          } else if (step.payload.fields) {
            fieldsPreview = Object.keys(step.payload.fields);
          }
          msgType = step.payloadTitle ? step.payloadTitle.split(' ')[0] : 'POST';
        } else {
          if (keys.includes('body') && typeof step.payload.body === 'object' && step.payload.body !== null) {
            fieldsPreview = Object.keys(step.payload.body);
          } else {
            fieldsPreview = keys.filter(k => k !== 'action' && k !== 'merchantId');
          }
          const title = (step.payloadTitle || '').toLowerCase();
          const labelLower = step.label.toLowerCase();
          if (title.includes('areq') || labelLower.includes('areq')) msgType = 'AReq';
          else if (title.includes('ares') || labelLower.includes('ares')) msgType = 'ARes';
          else if (title.includes('preq') || labelLower.includes('preq')) msgType = 'PReq';
          else if (title.includes('pres') || labelLower.includes('pres')) msgType = 'PRes';
          else if (title.includes('setup') || labelLower.includes('setup')) msgType = 'Setup';
        }
      }

      const isError = /err|invalid/i.test(step.num) || step.id.includes('err') || step.id.includes('invalid');

      // === Edge label staggering (audit Pillar 2 #4) ===
      // When two steps have the same source → target pair, their edge
      // labels overlap. We compute a yOffset based on how many earlier
      // parallel edges have been rendered to this pair, and pass it to
      // the EdgeLabelRenderer through `data.yOffset`. CustomEdge then
      // translates the label vertically.
      const pairKey = `${step.source}->${step.target}`;
      const parallelCount = activeSteps
        .slice(0, idx)
        .filter((s) => s.source && s.target && `${s.source}->${s.target}` === pairKey)
        .length;
      const yOffset = parallelCount * 22; // 22px per parallel edge

      // === Selected edge state (audit Pillar 2 #5) ===
      // If this step is the user's selected step, the edge gets a thicker
      // stroke and a glow. The same edge label gets aria-current="true"
      // so screen readers announce it as the current context.
      const isSelected = detailsContext.kind === 'step' && detailsContext.stepId === step.id;

      edgesList.push({
        id: `msg_edge_${step.id}`,
        source: `anchor_source_${step.id}`,
        target: `anchor_target_${step.id}`,
        sourceHandle,
        targetHandle,
        type: 'messageEdge',
        zIndex: 1,
        label: step.label,
        // xyflow reads `selected` on the edge object; we set it explicitly
        // so the right-panel click on the step also highlights the edge.
        selected: isSelected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: isCurrent ? sourceColor : isActive ? `${sourceColor}cc` : `${sourceColor}55`,
        },
        data: {
          color: isCurrent ? sourceColor : isActive ? `${sourceColor}cc` : `${sourceColor}55`,
          isCurrent,
          isError,
          isSelected,
          yOffset,
          stepNum: step.num,
          fieldsPreview: fieldsPreview.slice(0, 4),
          msgType,
        },
      });
    });

    // silence unused-var warnings for the dynamic lifeline length
    void lifelineLength;
    return edgesList;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphArgs]);

  // === Stable click handlers (useCallback so xyflow's internal
  // === subscription doesn't thrash on every render).
  const onNodeClick = useCallback((_: any, node: Node) => {
    uiActions.setRightCollapsed(false);

    if (node.id === 'domain_acquirer') {
      uiActions.setDetailsContext({ kind: 'domain', domainId: 'acquirer' });
      return;
    }
    if (node.id === 'domain_interop') {
      uiActions.setDetailsContext({ kind: 'domain', domainId: 'interop' });
      return;
    }
    if (node.id === 'domain_issuer') {
      uiActions.setDetailsContext({ kind: 'domain', domainId: 'issuer' });
      return;
    }
    if (node.id.startsWith('stepgroup_')) {
      const groupId = node.id.replace('stepgroup_', '') as StepGroupId;
      uiActions.setDetailsContext({ kind: 'group', groupId });
      return;
    }
    if (node.id.startsWith('header_')) {
      const participantId = node.id.replace('header_', '') as ParticipantId;
      uiActions.setDetailsContext({ kind: 'participant', participantId });
      return;
    }

    const stepId = node.id
      .replace('internal_', '')
      .replace('anchor_source_', '')
      .replace('anchor_target_', '');

    const active = flowStore.getState().activeSteps;
    const clickedIdx = active.findIndex((s) => s.id === stepId);
    if (clickedIdx !== -1) {
      flowActions.togglePlay();
      flowActions.setCurrentStepIndex(clickedIdx);
      uiActions.setDetailsContext({ kind: 'step', stepId });
    }
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    uiActions.setRightCollapsed(false);

    if (edge.id.startsWith('msg_edge_')) {
      const stepId = edge.id.replace('msg_edge_', '');
      const active = flowStore.getState().activeSteps;
      const clickedIdx = active.findIndex((s) => s.id === stepId);
      if (clickedIdx !== -1) {
        flowActions.togglePlay();
        flowActions.setCurrentStepIndex(clickedIdx);
        uiActions.setDetailsContext({ kind: 'step', stepId });
      }
      return;
    }

    if (edge.id.startsWith('lifeline_edge_')) {
      const participantId = edge.id.replace('lifeline_edge_', '') as ParticipantId;
      uiActions.setDetailsContext({ kind: 'participant', participantId });
    }
  }, []);

  const handleStepSelectFromTimeline = useCallback((idx: number) => {
    flowActions.togglePlay();
    flowActions.setCurrentStepIndex(idx);
    uiActions.setRightCollapsed(false);
    const step = flowStore.getState().activeSteps[idx];
    if (step) {
      uiActions.setDetailsContext({ kind: 'step', stepId: step.id });
    }
  }, []);

  const openGlossary = useCallback(() => {
    uiActions.setRightCollapsed(false);
    uiActions.setDetailsContext({ kind: 'glossary' });
  }, []);

  const applyScenarioPreset = useCallback((preset: ScenarioPreset) => {
    flowActions.setScenario(preset.scenario);
    flowActions.reset();
    flowActions.showAllGroups();
    uiActions.setDetailsContext({ kind: 'step', stepId: 'step_0A' });
    uiActions.setLeftCollapsed(false);
    uiActions.setRightCollapsed(false);
  }, []);

  const copyShareLink = useCallback(async () => {
    const state = flowStore.getState();
    const ui = uiStore.getState();
    const url = buildShareUrl({
      scenario: state.scenario,
      currentStepIndex: state.currentStepIndex,
      hiddenGroups: [...state.hiddenGroups],
      theme: ui.theme,
      securityLensEnabled: ui.securityLensEnabled,
      scenarioToolbarCollapsed: ui.isScenarioToolbarCollapsed,
    });
    window.history.replaceState({}, '', url);
    await navigator.clipboard.writeText(url.toString());
    uiActions.setShareCopied(true);
    setTimeout(() => uiActions.setShareCopied(false), 1600);
  }, []);

  // === Snapshot export. Triggers a JSON file download containing the
  // === full lab state. Unlike the permalink, the file is meant to be
  // === diffable in git and ingestable by CI.
  const exportSnapshot = useCallback(() => {
    const state = flowStore.getState();
    const json = serializeSnapshot({
      scenario: state.scenario,
      currentStepIndex: state.currentStepIndex,
      hiddenGroups: state.hiddenGroups,
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T.*$/, '');
    downloadSnapshot(json, `emv-3ds-lab-${stamp}.json`);
  }, []);

  // === Snapshot import. Reads a file, validates it, then hydrates
  // === the flow + UI stores. Failures surface in a transient toast.
  const importSnapshot = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseSnapshot(String(reader.result || ''));
      if (!result.ok || !result.snapshot) {
        setSnapshotImportStatus({ kind: 'err', message: result.errors[0] || 'Invalid snapshot file.' });
      } else {
        flowActions.hydrate({
          scenario: result.snapshot.scenario,
          currentStepIndex: result.snapshot.currentStepIndex,
          hiddenGroups: result.snapshot.hiddenGroups,
        });
        const warnings = result.warnings.length > 0 ? ` (${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'})` : '';
        setSnapshotImportStatus({ kind: 'ok', message: `Snapshot loaded from ${result.snapshot.capturedAt}${warnings}.` });
      }
      if (snapshotImportTimerRef.current) window.clearTimeout(snapshotImportTimerRef.current);
      snapshotImportTimerRef.current = window.setTimeout(() => setSnapshotImportStatus(null), 3500);
    };
    reader.onerror = () => {
      setSnapshotImportStatus({ kind: 'err', message: `Could not read file: ${reader.error?.message || 'unknown error'}` });
      if (snapshotImportTimerRef.current) window.clearTimeout(snapshotImportTimerRef.current);
      snapshotImportTimerRef.current = window.setTimeout(() => setSnapshotImportStatus(null), 3500);
    };
    reader.readAsText(file);
  }, []);

  const onSnapshotFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importSnapshot(file);
    // Reset so selecting the same file again still fires onChange.
    e.target.value = '';
  }, [importSnapshot]);

  // === Version toggle. Patches the scenario with the new protocol version;
  // === the store's `rebuild` will filter out groups that are too new for
  // === that version. We also reset the current step so the user lands on
  // === Step 0A and can re-walk the protocol under the new version.
  const setProtocolVersion = useCallback((v: ProtocolVersion) => {
    flowActions.patchScenario({ protocolVersion: v });
    flowActions.setCurrentStepIndex(0);
    uiActions.setDetailsContext({ kind: 'step', stepId: 'step_0A' });
  }, []);

  const liveStepAnnouncement = useMemo(() => {
    if (!currentStep) return '';
    const src = PARTICIPANTS.find(p => p.id === currentStep.source);
    const tgt = PARTICIPANTS.find(p => p.id === currentStep.target);
    const from = src ? src.name : 'Internal step';
    const to = tgt ? tgt.name : '';
    return `Step ${currentStep.num}: ${currentStep.label}. From ${from}${to ? ` to ${to}` : ''}.`;
  }, [currentStep]);

  // Note: the keyboard-shortcut for 1–8 scenario presets is wired via
  // `applyScenarioPresetRef` declared earlier (it must exist before
  // `handleKeyDown` so the listener can dispatch to it).

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Live-region announcement for assistive tech.
          Off-screen visually, but exposed to screen readers via aria-live. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="live-step-announcement"
      >
        {liveStepAnnouncement}
      </div>

      {/* Compact Top Bar */}
      <header className="app-header">
        <div className="header-brand">
          <Shield size={16} className="logo-icon" aria-hidden="true" />
          <span className="header-title">EMV 3DS Protocol Lab</span>
          <span className="header-divider" />
          <span
            className="spec-badge"
            title={`Active protocol version: ${scenario.protocolVersion}. Use the version toggle on the right to switch versions.`}
          >
            v{scenario.protocolVersion}
          </span>
          <span
            className={`header-chip header-chip-status status-${scenario.transStatus.toLowerCase()}`}
            title={`Transaction status: ${scenario.transStatus}${
              scenario.transStatus === 'Y' ? ' — Authenticated (full liability shift)' :
              scenario.transStatus === 'A' ? ' — Attempted authentication' :
              scenario.transStatus === 'N' ? ' — Not authenticated' :
              scenario.transStatus === 'U' ? ' — Unable to authenticate (technical error)' :
              scenario.transStatus === 'R' ? ' — Rejected by ACS' :
              scenario.transStatus === 'C' ? ' — Challenge required' :
              scenario.transStatus === 'D' ? ' — Decoupled authentication' :
              scenario.transStatus === 'I' ? ' — Information only (no liability shift)' :
              scenario.transStatus === 'S' ? ' — Secure Payment Confirmation' : ''
            }`}
            aria-label={`transStatus ${scenario.transStatus}${
              scenario.transStatus === 'Y' ? ', authenticated' :
              scenario.transStatus === 'A' ? ', attempted' :
              scenario.transStatus === 'N' ? ', not authenticated' :
              scenario.transStatus === 'U' ? ', unable to authenticate' :
              scenario.transStatus === 'R' ? ', rejected' :
              scenario.transStatus === 'C' ? ', challenge required' :
              scenario.transStatus === 'D' ? ', decoupled' :
              scenario.transStatus === 'I' ? ', information only' :
              scenario.transStatus === 'S' ? ', secure payment confirmation' : ''
            }`}
          >
            {scenario.transStatus}
          </span>
          {securityLensEnabled && (
            <span className="header-chip" style={{ color: 'var(--accent-secondary)', borderColor: 'rgba(155, 200, 66, 0.34)', background: 'rgba(155, 200, 66, 0.08)' }}>
              Research Lens
            </span>
          )}
        </div>

        <div className="header-actions">
          {/* === Version toggle (audit §1.2) === */}
          <div
            className="version-toggle"
            role="radiogroup"
            aria-label="EMV 3DS protocol version"
            title="Switch the active protocol version. Newer versions hide phases that did not exist yet."
          >
            {(['2.1.0', '2.2.0', '2.3.1'] as ProtocolVersion[]).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={scenario.protocolVersion === v}
                onClick={() => setProtocolVersion(v)}
                className={`version-toggle-btn ${scenario.protocolVersion === v ? 'active' : ''}`}
                title={`Switch to EMV 3DS v${v}`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={exportSnapshot}
            className="header-action-btn"
            title="Download a JSON snapshot of the current scenario state"
            aria-label="Download scenario snapshot as JSON"
          >
            <Download size={14} aria-hidden="true" />
            <span>Snapshot</span>
          </button>
          <button
            onClick={() => snapshotFileInputRef.current?.click()}
            className="header-action-btn"
            title="Load a JSON snapshot file"
            aria-label="Load scenario snapshot from file"
          >
            <Upload size={14} aria-hidden="true" />
            <span>Load</span>
          </button>
          <input
            ref={snapshotFileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onSnapshotFileChange}
            style={{ display: 'none' }}
            data-testid="snapshot-file-input"
            aria-label="Choose snapshot JSON file"
          />

          <button
            onClick={() => void copyShareLink()}
            className="header-action-btn"
            title="Copy a permalink for the current scenario state"
            aria-label="Copy a permalink for the current scenario state"
          >
            <Link2 size={14} aria-hidden="true" />
            <span>{shareCopied ? 'Copied' : 'Share'}</span>
          </button>
          <button
            onClick={() => uiActions.toggleSecurityLens()}
            className="header-action-btn"
            title={securityLensEnabled ? 'Disable Security Research Lens' : 'Enable Security Research Lens'}
            aria-label={securityLensEnabled ? 'Disable Security Research Lens' : 'Enable Security Research Lens'}
            aria-pressed={securityLensEnabled}
            style={securityLensEnabled ? {
              color: 'var(--accent-secondary)',
              borderColor: 'rgba(155, 200, 66, 0.35)',
              background: 'rgba(155, 200, 66, 0.08)'
            } : undefined}
          >
            <Crosshair size={14} aria-hidden="true" />
          </button>
          <button
            onClick={openGlossary}
            className="header-action-btn"
            title="Open 3DS Glossary & Reference"
            aria-label="Open 3DS Glossary and Reference"
          >
            <BookOpen size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => uiActions.cycleTheme()}
            className="theme-toggle-btn"
            title={
              theme === 'dark'
                ? 'Switch to Light Mode'
                : theme === 'light'
                ? 'Switch to Security Mode'
                : 'Switch to Dark Mode'
            }
            aria-label={
              theme === 'dark'
                ? 'Switch to Light Mode (currently Dark)'
                : theme === 'light'
                ? 'Switch to Security Mode (currently Light)'
                : 'Switch to Dark Mode (currently Security)'
            }
          >
            {theme === 'dark' ? (
              <Sun size={14} aria-hidden="true" />
            ) : theme === 'light' ? (
              <Moon size={14} aria-hidden="true" />
            ) : (
              <Terminal size={14} aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => uiActions.toggleListView()}
            className="header-action-btn"
            title={showListView ? 'Switch to canvas view' : 'Switch to list view (A11y fallback)'}
            aria-label={showListView ? 'Switch to canvas view' : 'Switch to list view (accessibility fallback)'}
            aria-pressed={showListView}
          >
            <List size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Snapshot import status toast (audit §1.3 / §4.3) */}
      {snapshotImportStatus && (
        <div
          role={snapshotImportStatus.kind === 'err' ? 'alert' : 'status'}
          aria-live="polite"
          className={`snapshot-toast snapshot-toast-${snapshotImportStatus.kind}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            fontSize: '11px',
            fontWeight: 600,
            color: snapshotImportStatus.kind === 'err' ? '#fecaca' : '#bbf7d0',
            background: snapshotImportStatus.kind === 'err' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            borderTop: `1px solid ${snapshotImportStatus.kind === 'err' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderBottom: `1px solid ${snapshotImportStatus.kind === 'err' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}
        >
          {snapshotImportStatus.kind === 'err' ? <FileWarning size={12} aria-hidden="true" /> : <Info size={12} aria-hidden="true" />}
          <span>{snapshotImportStatus.message}</span>
        </div>
      )}

      <section className={`scenario-toolbar ${isScenarioToolbarCollapsed ? 'collapsed' : ''}`}>
        <div className="scenario-toolbar-row">
          <button
            type="button"
            className="scenario-toolbar-toggle"
            onClick={() => uiActions.toggleScenarioToolbar()}
            title={isScenarioToolbarCollapsed ? 'Expand scenario catalog' : 'Collapse scenario catalog'}
            aria-expanded={!isScenarioToolbarCollapsed}
            aria-label="Toggle scenario catalog"
          >
            <Sparkles size={12} aria-hidden="true" />
            <span className="scenario-toolbar-kicker">Scenario</span>
            {isScenarioToolbarCollapsed ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronUp size={12} aria-hidden="true" />}
          </button>
          <div className="scenario-toolbar-copy">
            <strong>{scenarioSummary.title}</strong>
            {!isScenarioToolbarCollapsed && <span>{scenarioSummary.description}</span>}
          </div>
          <div className="scenario-facts">
            {scenarioFacts.map((fact) => (
              <div key={fact.label} className="scenario-fact-pill">
                <span className="scenario-fact-label">{fact.label}</span>
                <span className="scenario-fact-value">{fact.value}</span>
              </div>
            ))}
          </div>
        </div>
        {!isScenarioToolbarCollapsed && (
          <div className="scenario-preset-list">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`scenario-preset-btn ${scenarioPresetId === preset.id ? 'active' : ''}`}
                onClick={() => applyScenarioPreset(preset)}
                title={preset.summary}
                aria-label={`Apply ${preset.label} scenario: ${preset.summary}`}
              >
                <span className="scenario-preset-label">{preset.label}</span>
                <span className="scenario-preset-summary">{preset.summary}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Main Dashboard Layout with smooth width transitions */}
      <main
        className="dashboard-grid"
        style={{
          gridTemplateColumns: `${isLeftCollapsed ? '0px' : '380px'} 1fr ${isRightCollapsed ? '0px' : '390px'}`,
          transition: 'grid-template-columns 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Left Side Panel (Controls) */}
        <aside className={`sidebar ${isLeftCollapsed ? 'collapsed' : ''}`}>
          <Controls
            scenario={scenario}
            setScenario={(s: Scenario) => flowActions.setScenario(s)}
            currentStepIndex={currentStepIndex}
            setCurrentStepIndex={handleStepSelectFromTimeline}
            totalSteps={activeSteps.length}
            isPlaying={isPlaying}
            setIsPlaying={(p: boolean) => p ? flowActions.togglePlay() : (isPlaying && flowActions.togglePlay())}
            playSpeed={playSpeed}
            setPlaySpeed={(s) => flowActions.setPlaySpeed(s as 800 | 1500 | 2500 | 5000)}
            activeStepLabel={currentStep?.label || ''}
            activeStepNum={currentStep?.num || ''}
            activeSteps={activeSteps}
          />
        </aside>

        {/* Center Panel (React Flow sequence diagram) */}
        <section className="canvas-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <button
            className="panel-toggle-btn left"
            onClick={() => uiActions.setLeftCollapsed(!isLeftCollapsed)}
            title={isLeftCollapsed ? 'Expand Left Panel' : 'Collapse Left Panel'}
            aria-label={isLeftCollapsed ? 'Expand left panel' : 'Collapse left panel'}
            aria-expanded={!isLeftCollapsed}
          >
            {isLeftCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
          </button>

          <button
            className="panel-toggle-btn right"
            onClick={() => uiActions.setRightCollapsed(!isRightCollapsed)}
            title={isRightCollapsed ? 'Expand Right Panel' : 'Collapse Right Panel'}
            aria-label={isRightCollapsed ? 'Expand right panel' : 'Collapse right panel'}
            aria-expanded={!isRightCollapsed}
          >
            {isRightCollapsed ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>

          <div className="canvas-flow-shell">
            {/*
              A11y fallback: when uiStore.showListView is true, hide the
              canvas and present a screen-reader-friendly linear list of
              every active step. The user can still click any step to
              navigate. This is also the default for `prefers-reduced-
              motion: reduce` users who want to inspect the protocol
              without animation churn.
            */}
            {showListView ? (
              <div className="list-view-root" role="region" aria-label="Protocol step list view">
                <h2 className="list-view-title">EMV 3DS Protocol — Step-by-Step</h2>
                <p className="list-view-subtitle">
                  A linear, screen-reader-friendly rendering of the {activeSteps.length} active steps. Press Tab to focus a step, Enter to open it in the right panel.
                </p>
                <ol className="list-view-list" aria-label="Active flow steps in chronological order">
                  {activeSteps.map((step, idx) => {
                    const src = PARTICIPANTS.find(p => p.id === step.source);
                    const tgt = PARTICIPANTS.find(p => p.id === step.target);
                    const isCurrent = idx === currentStepIndex;
                    const isError = /err|invalid/i.test(step.num) || step.id.includes('err') || step.id.includes('invalid');
                    return (
                      <li
                        key={step.id}
                        className="list-view-item"
                        data-step-state={isError ? 'error' : isCurrent ? 'current' : idx <= currentStepIndex ? 'active' : 'default'}
                        data-testid={`list-step-${step.num}`}
                        role="button"
                        tabIndex={0}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-label={`Step ${step.num}: ${step.label}${isError ? ' (error path)' : ''}. ${src ? `From ${src.name}` : ''} ${tgt ? `to ${tgt.name}` : ''}.`}
                        onClick={() => handleStepSelectFromTimeline(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleStepSelectFromTimeline(idx);
                          }
                        }}
                      >
                        <span className="list-view-num">STEP {step.num}</span>
                        <span className="list-view-label">{step.label}</span>
                        <span className="list-view-pair">
                          {src ? src.name : '—'}
                          {tgt ? ` → ${tgt.name}` : ''}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}

            {!showListView && activeSteps.length === 0 && (
              <div className="canvas-empty-state fade-in" role="status">
                <div className="canvas-empty-state-title">All phases hidden</div>
                <div className="canvas-empty-state-desc">
                  The sequence diagram is empty because every step group is currently hidden. Click <strong>All</strong> in the Step Groups legend below to bring them back.
                </div>
                <button
                  type="button"
                  className="canvas-empty-state-btn"
                  onClick={showAllGroups}
                >
                  <Eye size={12} aria-hidden="true" />
                  <span>Show all phases</span>
                </button>
              </div>
            )}

            {/*
              `<ReactFlow>` is rendered in read-only mode by intent:
                - nodesDraggable={false}: protocol steps have fixed coordinates
                  derived from the participant lane layout, not user input
                - nodesConnectable={false}: edges are computed from the flow
                  data, not drawn by the user (this is a vendor-neutral
                  protocol diagram, not a free-form editor). Handle hit
                  targets are 8x8 (in CustomNode.tsx) for screen-reader
                  hit-test, but the user cannot draw new edges.
                - elementsSelectable={true}: keep selection so the right
                  panel can show the details of whatever the user clicks

              Performance:
                - onlyRenderVisibleElements: viewport-cull the 90+ nodes so
                  the DOM size stays small when the user is zoomed into a
                  single phase. xyflow handles the intersection math; we
                  just opt in.

              Accessibility:
                - role="graphics-document" + aria-roledescription expose
                  the canvas as a structured diagram to screen readers.
                - The <StepNumberRailNode> and <InternalStepNode> each
                  carry role="button" + tabIndex={0} when current, so the
                  step is reachable by Tab.
                - The phase-band chip text + the live-region announcement
                  in the <App> root provide the textual story for the
                  visual diagram.

              When uiStore.showListView is true, we skip the ReactFlow
              mount entirely (xyflow v12 leaks listeners if you unmount
              while playing; toggling list view exits play mode first).
            */}
            {!showListView && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
              zoomOnDoubleClick={true}
              panOnDrag={true}
              preventScrolling={false}
              onlyRenderVisibleElements={true}
              role="graphics-document"
              aria-label="EMV 3DS sequence diagram"
              aria-roledescription="Sequence diagram"
            >
              {/* The dot grid is now 32px (sparse) so it does not conflict
                  with the 14px phase-band dot pattern. See CSS rule in
                  App.css for the .react-flow__background-pattern.dots
                  override. */}
              <Background
                color={theme === 'dark' ? '#1a1a1f' : '#cbd5e1'}
                bgColor="transparent"
                gap={32}
                size={1}
                variant={BackgroundVariant.Dots}
              />
              <ReactFlowControls position="bottom-right" />
              {/*
                The MiniMap is now collapsible (120×80px when collapsed)
                and positioned bottom-left under the legend, so the four
                bottom corners each host exactly one floating control:
                  bottom-left:  MiniMap (collapsible)
                  bottom-right: ReactFlow zoom controls
                  top-left:     scenario toolbar toggle
                  top-right:    panel toggle buttons
              */}
              <MiniMap
                nodeColor={() => (theme === 'dark' ? '#27272a' : '#cbd5e1')}
                zoomable
                pannable
                position="bottom-left"
                style={{ width: 120, height: 80 }}
                maskColor={theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'}
                aria-label="Diagram minimap"
              />
            </ReactFlow>
            )}

            {isProfilingMounted && !showListView && <BrowserFingerprintWidget />}

            <div className="canvas-legend">
              <div className="legend-header">
                <h4 className="legend-title">Step Groups (Phases)</h4>
                <div className="legend-header-actions">
                  <button
                    type="button"
                    className="legend-mini-btn"
                    onClick={showAllGroups}
                    disabled={hiddenGroups.length === 0}
                    title="Show all phases"
                    aria-label="Show all phases"
                  >
                    <Eye size={11} aria-hidden="true" />
                    <span>All</span>
                  </button>
                  <button
                    type="button"
                    className="legend-mini-btn"
                    onClick={hideAllGroups}
                    disabled={hiddenGroups.length === activeGroups.length}
                    title="Hide all phases"
                    aria-label="Hide all phases"
                  >
                    <EyeOff size={11} aria-hidden="true" />
                    <span>None</span>
                  </button>
                </div>
              </div>
              <div className="legend-items legend-groups">
                {STEP_GROUPS.map((g) => {
                  const isHidden = hiddenGroups.includes(g.id);
                  const inActive = activeGroups.some((ag) => ag.id === g.id);
                  const isIsolated =
                    !isHidden &&
                    STEP_GROUPS.filter((other) => other.id !== g.id).every(
                      (other) => hiddenGroups.includes(other.id)
                    ) &&
                    hiddenGroups.length > 0;
                  return (
                    <div
                      key={g.id}
                      className={`legend-group-row ${currentStep?.groupId === g.id ? 'is-current' : ''} ${isHidden ? 'is-hidden' : ''} ${!inActive ? 'is-inactive' : ''} ${isIsolated ? 'is-isolated' : ''}`}
                      title={g.description}
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroupVisibility(g.id)}
                        disabled={!inActive && isHidden}
                        className={`legend-group-item ${currentStep?.groupId === g.id ? 'is-current' : ''} ${isHidden ? 'is-hidden' : ''} ${!inActive ? 'is-inactive' : ''}`}
                        title={isHidden ? `Show "${g.title}" phase` : `Hide "${g.title}" phase`}
                        aria-label={isHidden ? `Show ${g.title} phase` : `Hide ${g.title} phase`}
                        aria-pressed={isHidden}
                      >
                        <span className="legend-group-swatch" style={{ background: g.color }} />
                        <span className="legend-group-label">{g.title}</span>
                        <span className="legend-group-eye" aria-hidden="true">
                          {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`legend-isolate-btn ${isIsolated ? 'is-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isIsolated) {
                            showAllGroups();
                          } else {
                            isolateGroup(g.id);
                          }
                        }}
                        title={isIsolated ? `Exit isolated view (showing only "${g.title}")` : `Isolate "${g.title}" — show only this phase`}
                        aria-label={isIsolated ? `Show all phases (currently isolated to ${g.title})` : `Isolate ${g.title} phase`}
                      >
                        <Crosshair size={11} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {hiddenGroups.length > 0 && (
                <div className="legend-hidden-banner" role="status">
                  {hiddenGroups.length} phase{hiddenGroups.length === 1 ? '' : 's'} hidden — click an entry above to show.
                </div>
              )}
              <h4 className="legend-title" style={{ marginTop: '8px' }}>Participants</h4>
              <div className="legend-items">
                {PARTICIPANTS.map((p) => (
                  <div key={p.id} className="legend-item">
                    <span className="legend-dot" style={{ background: p.stroke }} />
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right Side Panel (Details) */}
        <aside className={`details-sidebar ${isRightCollapsed ? 'collapsed' : ''}`}>
          <DetailsPanel
            step={currentStep || activeSteps[0] || FLOW_STEPS[0]}
            scenario={scenario}
            context={detailsContext as DetailsContext}
            securityLensEnabled={securityLensEnabled}
            onShowStep={(stepId) => {
              const idx = activeSteps.findIndex(s => s.id === stepId);
              if (idx !== -1) {
                flowActions.setCurrentStepIndex(idx);
                uiActions.setDetailsContext({ kind: 'step', stepId });
              }
            }}
            onShowGlossary={openGlossary}
            onShowGroup={(groupId) => uiActions.setDetailsContext({ kind: 'group', groupId })}
            onShowParticipant={(participantId) => uiActions.setDetailsContext({ kind: 'participant', participantId })}
            onShowDomain={(domainId) => uiActions.setDetailsContext({ kind: 'domain', domainId })}
          />
        </aside>
      </main>

      {/* === Sandbox isolation footer (audit §4.3 / axis 6) ===
           One-line credibility cue for security engineers: this tool
           renders static reference payloads, makes no network calls,
           and represents neither an EMVCo-certified kernel nor a
           production-ready 3DS Server. */}
      <footer
        className="sandbox-banner"
        role="note"
        aria-label="Sandbox isolation notice"
      >
        <FileWarning size={12} aria-hidden="true" />
        <span>
          <strong>Sandbox only.</strong> This tool renders static reference payloads —
          no AReq is signed, no ACS is contacted, no data leaves your browser.
          Mock responses are <em>not</em> EMVCo-certified kernel behavior.
        </span>
      </footer>
    </div>
  );
}

// Wrap the live profiler widget in React.memo so that when a parent
// re-renders (e.g. scenario preset click), the widget's own internal
// state — the dot interval, the progress interval, the browserData
// memoization — does not tear down. Without this, the 80ms progress
// interval reset and the user sees a 0% bar for 1 frame.
const BrowserFingerprintWidget = memo(function BrowserFingerprintWidget() {
  // We read the same five browser attributes the EMVCo §3.1.2.3 list
  // requires, but the canonical list is wider. The full EMVCo reference
  // is shown below the live data; the live row is an *educational
  // annotation* — no data leaves the browser.
  const [liveData, setLiveData] = useState<{
    userAgent: string;
    language: string;
    colorDepth: number;
    screenRes: string;
    tzOffset: number;
    java: boolean;
    cookies: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.screen) {
      setLiveData(null);
      return;
    }
    setLiveData({
      userAgent: navigator.userAgent.substring(0, 75) + (navigator.userAgent.length > 75 ? '…' : ''),
      language: navigator.language || 'en-US',
      colorDepth: window.screen.colorDepth,
      screenRes: `${window.screen.width} × ${window.screen.height}`,
      tzOffset: new Date().getTimezoneOffset(),
      java: typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : false,
      cookies: navigator.cookieEnabled,
    });
  }, []);

  // Map of EMVCo field name → the value the current browser would send,
  // or `null` if the field is not browser-derivable.
  const liveValueFor = (field: string): string | null => {
    if (!liveData) return null;
    switch (field) {
      case 'BrowserAcceptHeader': return null; // Not browser-derivable on the client.
      case 'BrowserIP': return null; // Server-side only.
      case 'BrowserJavaEnabled': return String(liveData.java);
      case 'BrowserJavaScriptEnabled': return 'true'; // The widget itself proves this.
      case 'BrowserLanguage': return liveData.language;
      case 'BrowserColorDepth': return `${liveData.colorDepth}-bit`;
      case 'BrowserScreenHeight': return String(window.screen.height);
      case 'BrowserScreenWidth': return String(window.screen.width);
      case 'BrowserTZ': return `${liveData.tzOffset} min`;
      case 'BrowserUserAgent': return liveData.userAgent;
      case 'DeviceChannel': return '02 (Browser)';
      default: return null;
    }
  };

  return (
    <div
      className="fingerprint-widget fade-in"
      role="region"
      aria-label="EMVCo device data collection reference"
    >
      <div className="widget-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="live-indicator" aria-hidden="true" />
          <span style={{ fontWeight: 800, letterSpacing: '0.05em', color: 'var(--accent-secondary)' }}>
            EMVCo §3.1.2.3 — Device Data Reference
          </span>
        </div>
        <span style={{ fontSize: '9px', opacity: 0.7 }}>3DS Method iframe</span>
      </div>

      <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.45, padding: '4px 0 6px', borderBottom: '1px dashed var(--border-color)', marginBottom: '6px' }}>
        The 3DS Method URL is allowed to read these browser/device attributes
        for risk scoring. The live row below shows what <em>your</em> browser
        would report — <strong>nothing is transmitted</strong>.
        See <code>EMVCo §3.1.2.3</code> in the latest spec for the canonical list.
      </div>

      <div role="list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
        {EMVCO_DEVICE_FIELDS.filter((f) => f.browserSource).map((f) => {
          const live = liveValueFor(f.name);
          return (
            <div
              key={f.name}
              role="listitem"
              title={f.researchNote}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '4px 6px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {f.name}
                <span style={{ marginLeft: '4px', color: f.requirement === 'R' ? '#fb923c' : '#64748b' }}>({f.requirement})</span>
              </span>
              <span
                className="font-mono"
                style={{ fontSize: '10.5px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {live ?? '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="widget-footer" style={{ marginTop: '6px' }}>
        Read-only educational overlay. The lab never makes the threeDSMethodData POST — that lives in real ACS implementations.
      </div>
    </div>
  );
});

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
