import { useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  Controls as ReactFlowControls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Shield, Sun, Moon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookOpen, Eye, EyeOff, Crosshair, Link2, Sparkles } from 'lucide-react';
import './App.css';

import type { Scenario, FlowStep, StepGroupId, ParticipantId } from './types';
import { PARTICIPANTS, FLOW_STEPS, STEP_GROUPS } from './data/flowData';
import { ParticipantHeaderNode, LifelineAnchorNode, LifelineBottomNode, InternalStepNode, DomainGroupNode, StepGroupBandNode, SwimlaneColumnNode, StepNumberRailNode } from './components/CustomNode';
import { CustomMessageEdge } from './components/CustomEdge';
import { Controls } from './components/Controls';
import { DetailsPanel } from './components/DetailsPanel';
import type { DetailsContext } from './components/DetailsPanel';

// (DetailsContext is re-exported above for the rest of the app)

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
// Sits 200px to the left of the CH column so it never overlaps lifelines,
// headers, or message arrows.
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
  theme?: 'dark' | 'light';
  securityLensEnabled?: boolean;
  scenarioToolbarCollapsed?: boolean;
};

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'frictionless_y',
    label: 'Frictionless Y',
    summary: 'Approval without a visible challenge.',
    scenario: { ...DEFAULT_SCENARIO, transStatus: 'Y' },
  },
  {
    id: 'attempts_a',
    label: 'Attempts A',
    summary: 'Attempts flow when full auth is not completed.',
    scenario: { ...DEFAULT_SCENARIO, transStatus: 'A', methodPath: 'reused' },
  },
  {
    id: 'challenge_success',
    label: 'Challenge Success',
    summary: 'Interactive challenge that returns success.',
    scenario: { ...DEFAULT_SCENARIO, transStatus: 'C', challengeOutcome: 'success', challengeMandated: 'Y' },
  },
  {
    id: 'challenge_failure',
    label: 'Challenge Failure',
    summary: 'Challenge completed but authentication fails.',
    scenario: { ...DEFAULT_SCENARIO, transStatus: 'C', challengeOutcome: 'failure', challengeMandated: 'Y' },
  },
  {
    id: 'decoupled_d',
    label: 'Decoupled D',
    summary: 'ACS defers completion into decoupled authentication.',
    scenario: { ...DEFAULT_SCENARIO, transStatus: 'D', challengeOutcome: 'decoupled', challengePresentation: 'oob' },
  },
  {
    id: 'opt_out',
    label: 'Opt-out',
    summary: 'Requestor opt-out path with resultsStatus 02.',
    scenario: { ...DEFAULT_SCENARIO, transStatus: 'C', challengeOutcome: 'optout', challengePreference: '02', challengeMandated: 'Y' },
  },
  {
    id: 'info_only',
    label: 'Info Only',
    summary: 'Information-only processing path.',
    scenario: { ...DEFAULT_SCENARIO, transStatus: 'I', methodPath: 'unavailable' },
  },
  {
    id: 'spc_s',
    label: 'SPC S',
    summary: 'Secure Payment Confirmation success-style branch.',
    scenario: { ...DEFAULT_SCENARIO, transStatus: 'S', challengePresentation: 'oob' },
  },
];

const getScenarioSummary = (scenario: Scenario) => {
  if (scenario.challengeOutcome === 'optout') {
    return {
      title: 'Requestor Opt-out',
      description: 'Challenge flow ends with requestor opt-out semantics and resultsStatus 02.',
    };
  }

  switch (scenario.transStatus) {
    case 'Y':
      return { title: 'Frictionless Success', description: 'ACS approves the transaction without a visible challenge.' };
    case 'A':
      return { title: 'Attempts Path', description: 'Attempts processing is returned instead of a full success.' };
    case 'N':
      return { title: 'Authentication Failed', description: 'Authentication was attempted and did not succeed.' };
    case 'U':
      return { title: 'Unable To Authenticate', description: 'The protocol could not complete a reliable authentication result.' };
    case 'R':
      return { title: 'Rejected', description: 'ACS rejects the transaction before completion.' };
    case 'C':
      return { title: 'Challenge Flow', description: 'The flow enters an interactive challenge branch.' };
    case 'D':
      return { title: 'Decoupled Authentication', description: 'ACS moves the flow into decoupled completion.' };
    case 'I':
      return { title: 'Information Only', description: 'The request is handled as information-only rather than full authentication.' };
    case 'S':
      return { title: 'SPC Path', description: 'The branch reflects Secure Payment Confirmation semantics.' };
    default:
      return { title: 'Protocol Scenario', description: 'Inspect the rendered branch to understand what changed.' };
  }
};

const buildShareUrl = (state: SharedAppState) => {
  const url = new URL(window.location.href);
  url.searchParams.set('state', JSON.stringify(state));
  return url;
};

function AppContent() {
  // Scenario configurations
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);

  // Theme support
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [hasLoadedSharedState, setHasLoadedSharedState] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Collapsible Sidebars state
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isScenarioToolbarCollapsed, setIsScenarioToolbarCollapsed] = useState(true);
  const [securityLensEnabled, setSecurityLensEnabled] = useState(false);

  // Step Group visibility (Phases) — researchers can hide entire phases
  // they don't care about. Empty set means "all visible".
  const [hiddenGroups, setHiddenGroups] = useState<Set<StepGroupId>>(() => new Set());

  const toggleGroupVisibility = (groupId: StepGroupId) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const showAllGroups = () => setHiddenGroups(new Set());

  const hideAllGroups = () => {
    // Hide every group that currently has at least one active step
    const all = new Set<StepGroupId>();
    FLOW_STEPS.forEach((step) => {
      if (step.groupId) all.add(step.groupId);
    });
    setHiddenGroups(all);
  };

  /**
   * Isolate a single phase: hide every other group and show only the
   * target. Useful when a researcher wants to study one phase in detail.
   */
  const isolateGroup = (groupId: StepGroupId) => {
    const all = new Set<StepGroupId>();
    FLOW_STEPS.forEach((step) => {
      if (step.groupId && step.groupId !== groupId) all.add(step.groupId);
    });
    setHiddenGroups(all);
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Playback player state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2500); // 2.5s default

  // What the DetailsPanel should show. Clicking any element on the canvas
  // sets this so the right panel is always informative.
  const [detailsContext, setDetailsContext] = useState<DetailsContext>({ kind: 'step', stepId: 'step_0A' });

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawState = params.get('state');

      if (rawState) {
        const parsed = JSON.parse(rawState) as SharedAppState;

        if (parsed.scenario) {
          setScenario({ ...DEFAULT_SCENARIO, ...parsed.scenario });
        }

        if (parsed.theme === 'dark' || parsed.theme === 'light') {
          setTheme(parsed.theme);
        }

        if (typeof parsed.currentStepIndex === 'number' && Number.isFinite(parsed.currentStepIndex)) {
          setCurrentStepIndex(Math.max(0, parsed.currentStepIndex));
        }

        if (Array.isArray(parsed.hiddenGroups)) {
          setHiddenGroups(new Set(parsed.hiddenGroups));
        }

        if (typeof parsed.securityLensEnabled === 'boolean') {
          setSecurityLensEnabled(parsed.securityLensEnabled);
        }

        if (typeof parsed.scenarioToolbarCollapsed === 'boolean') {
          setIsScenarioToolbarCollapsed(parsed.scenarioToolbarCollapsed);
        }
      }
    } catch {
      // Ignore malformed shared state and fall back to the default protocol lab view.
    } finally {
      setHasLoadedSharedState(true);
    }
  }, []);

  // When playback advances, if the user is currently viewing the same step,
  // follow playback. If they have selected a different context, leave it.
  useEffect(() => {
    if (detailsContext.kind === 'step') {
      const current = activeSteps[currentStepIndex];
      if (current && current.id !== detailsContext.stepId) {
        // User hasn't explicitly selected a different element, so follow playback
        // (Only auto-follow if the user is in step mode and the playback moved)
        if (isPlaying || detailsContext.stepId === 'step_0A') {
          setDetailsContext({ kind: 'step', stepId: current.id });
        }
      }
    }
    // We intentionally only react to currentStepIndex changes, not the context itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, isPlaying]);

  // Determine active steps for the current scenario configuration,
  // minus any phases the user has explicitly hidden.
  const activeSteps: FlowStep[] = useMemo(() => {
    return FLOW_STEPS.filter(
      (step) => step.isActive(scenario) && (!step.groupId || !hiddenGroups.has(step.groupId))
    );
  }, [scenario, hiddenGroups]);

  // If hiding a phase drops the step list beneath the current index, clamp down.
  useEffect(() => {
    if (activeSteps.length === 0) {
      if (currentStepIndex !== 0) setCurrentStepIndex(0);
      return;
    }
    if (currentStepIndex >= activeSteps.length) {
      setCurrentStepIndex(activeSteps.length - 1);
    }
  }, [activeSteps.length, currentStepIndex]);

  // Keep detailsContext in sync when activeSteps shrinks (e.g. last step was hidden)
  useEffect(() => {
    if (
      detailsContext.kind === 'step' &&
      activeSteps.length > 0 &&
      !activeSteps.some((s) => s.id === detailsContext.stepId)
    ) {
      const fallback = activeSteps[Math.min(currentStepIndex, activeSteps.length - 1)];
      if (fallback) {
        setDetailsContext({ kind: 'step', stepId: fallback.id });
      }
    }
  }, [activeSteps, detailsContext, currentStepIndex]);

  // A safe fallback step for downstream consumers (DetailsPanel, etc.) when
  // every phase has been hidden and `activeSteps` is empty.
  const fallbackStep: FlowStep | undefined = useMemo(
    () => activeSteps[currentStepIndex] || activeSteps[0] || FLOW_STEPS[0],
    [activeSteps, currentStepIndex]
  );
  const currentStep = fallbackStep;
  const isProfilingActive = currentStep && (currentStep.num === '3b' || currentStep.num.startsWith('4'));
  const currentGroupMeta = currentStep?.groupId ? STEP_GROUPS.find((g) => g.id === currentStep.groupId) : undefined;
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

  useEffect(() => {
    if (!shareCopied) return;

    const timeout = window.setTimeout(() => {
      setShareCopied(false);
    }, 1600);

    return () => window.clearTimeout(timeout);
  }, [shareCopied]);

  // Auto-play effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex((prevIndex) => {
          if (prevIndex >= activeSteps.length - 1) {
            setIsPlaying(false); // Stop at the end
            return prevIndex;
          }
          return prevIndex + 1;
        });
      }, playSpeed);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, activeSteps.length, playSpeed]);

  // Keyboard Navigation Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStepIndex((prev) => Math.min(activeSteps.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStepIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSteps.length]);

  // React Flow instance view fitting
  const { fitView } = useReactFlow();

  // Automatically zoom and center diagram when sidebar collapse states, active steps length, or window size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 350, padding: 0.15 });
    }, 320); // Wait for CSS transition (300ms) to complete
    return () => clearTimeout(timer);
  }, [isLeftCollapsed, isRightCollapsed, activeSteps.length, fitView]);

  // Trigger fitView initially when canvas loads
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.12 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView]);

  // Construct nodes and edges dynamically based on scenario, spacing coordinates, and active playback index
  const { nodes, edges } = useMemo(() => {
    const nodesList: Node[] = [];
    const edgesList: Edge[] = [];

    // Calculate dynamic lifeline length based on step count
    const lifelineLength = Math.max(1100, 180 + activeSteps.length * 90);

    // 0a. Compute step group band positions (drawn first so they sit behind everything)
    // For each STEP_GROUPS entry, find min and max Y of steps in that group
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

    // Build a list of groups that actually have visible steps, in the
    // canonical STEP_GROUPS order. We use this to assign 1-based phase
    // indices (P01, P02, ...) so the user can refer to phases by index.
    const visibleGroups = STEP_GROUPS.filter((g) => groupYRange[g.id]?.count > 0);
    const phaseIndexById: Record<string, number> = {};
    visibleGroups.forEach((g, i) => {
      phaseIndexById[g.id] = i + 1;
    });

    // Band width: full lane width, from CH-110 to ACS+110 = 1600px
    const bandX = X_COORDS.CH - 110;
    const bandWidth = X_COORDS.ACS - X_COORDS.CH + 220;

    STEP_GROUPS.forEach((g) => {
      const range = groupYRange[g.id];
      if (!range || range.count === 0) return;
      // Add 30px padding above and below for breathing room
      const y = range.min - 30;
      const height = (range.max - range.min) + 60;
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
        },
        draggable: false,
        selectable: true,
      });
    });

    // 0b. Three Domains Background containers
    // Acquirer/Merchant Domain encapsulates CH, BR, RE, S (X from 150 to 930)
    nodesList.push({
      id: 'domain_acquirer',
      type: 'domainContainer',
      position: { x: X_COORDS.CH - 110, y: -20 },
      data: {
        title: 'Acquirer Domain',
        subtitle: 'Merchant & 3DS Requestor Environment',
        color: '#2563eb', // Blue
        width: X_COORDS.S - X_COORDS.CH + 220,
        height: lifelineLength + 60,
      },
      draggable: false,
      selectable: true,
    });

    // Interoperability Domain encapsulates DS (X = 1190)
    nodesList.push({
      id: 'domain_interop',
      type: 'domainContainer',
      position: { x: X_COORDS.DS - 110, y: -20 },
      data: {
        title: 'Interoperability Domain',
        subtitle: 'Payment System Directory Server',
        color: '#8b5cf6', // Purple
        width: 220,
        height: lifelineLength + 60,
      },
      draggable: false,
      selectable: true,
    });

    // Issuer Domain encapsulates ACS (X = 1450)
    nodesList.push({
      id: 'domain_issuer',
      type: 'domainContainer',
      position: { x: X_COORDS.ACS - 110, y: -20 },
      data: {
        title: 'Issuer Domain',
        subtitle: 'Card Issuer Access Control Server',
        color: '#10b981', // Emerald Green
        width: 220,
        height: lifelineLength + 60,
      },
      draggable: false,
      selectable: true,
    });

    // 0. Per-participant swimlane columns — the deepest background layer.
    // Each lane is a 220px wide column whose center coincides with the
    // participant's X coordinate, so the column pans and zooms in lock-step
    // with the participant header inside the React Flow viewport. The lane
    // tracks the lifeline length so the visual rail extends the full
    // height of the diagram.
    //
    // zIndex is 0 (default) rather than negative because React Flow v12's
    // Background component paints at the pane stacking-context level with
    // a solid background-color (#141414 in dark mode). Pushing nodes to
    // negative z-indices puts them behind that solid background and they
    // disappear. The swimlane column is therefore rendered at zIndex 0
    // but pushed FIRST in the nodesList so it sits at the back of the
    // node stack (the Background paints before nodes, and within nodes
    // the array order is the secondary tie-breaker).
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

    // 1. Participant Header Nodes (at the top)
    PARTICIPANTS.forEach((p) => {
      // Compute per-participant "is actor involved in current step" once,
      // so it can be reused by the header, the bottom cap, and the rail.
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

      // 2. Lifeline Anchor Nodes (at the bottom to anchor vertical rail)
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

      // 3. Connect top header to bottom lifeline

      edgesList.push({
        id: `lifeline_edge_${p.id}`,
        source: `header_${p.id}`,
        target: `lifeline_bottom_${p.id}`,
        type: 'straight',
        // Lifelines must sit ABOVE the swimlane column background
        // rectangles; without zIndex xyflow paints them below the
        // background nodes (web#458). Edge-level zIndex (not
        // style.zIndex) is the supported knob.
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

    // 4. Step Nodes and Horizontal Message Edges (vertical gaps of 90px for comfortable reading)
    activeSteps.forEach((step, idx) => {
      const stepY = 140 + idx * 90; // vertical distribution
      const isActive = idx <= currentStepIndex; // executed steps
      const isCurrent = idx === currentStepIndex; // current active step

      // Step-number rail chip on the left margin — gives the user a
      // glanceable index per row even when zoomed out far enough that the
      // inline lifeline anchors become hard to find.
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
        // Message between two participants
        const sourcePart = PARTICIPANTS.find(p => p.id === step.source);
        const sourceColor = sourcePart ? sourcePart.stroke : '#6366f1';

        // Add small anchor nodes on lifelines
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

        // Determine left/right handle connections to make edges perfectly horizontal
        const isSourceLeft = X_COORDS[step.source] < X_COORDS[step.target];
        const sourceHandle = isSourceLeft ? 'right' : 'left';
        const targetHandle = isSourceLeft ? 'left' : 'right';

        // Dynamically extract preview fields and message abbreviation
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

        // Add directed message edge using our CustomMessageEdge component
        edgesList.push({
          id: `msg_edge_${step.id}`,
          source: `anchor_source_${step.id}`,
          target: `anchor_target_${step.id}`,
          sourceHandle,
          targetHandle,
          type: 'messageEdge',
          // xyflow renders edges BELOW nodes by default
          // (see xyflow/web#458). Because our swimlane columns are nodes
          // sitting behind the lifelines, we lift each message edge with
          // zIndex=1 so it never gets occluded by a participant header or
          // domain container. Use `edge.zIndex`, NOT `style.zIndex` —
          // the latter is silently ignored by xyflow.
          zIndex: 1,
          label: step.label,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: isCurrent ? sourceColor : isActive ? `${sourceColor}cc` : `${sourceColor}55`,
          },
          data: {
            color: isCurrent ? sourceColor : isActive ? `${sourceColor}cc` : `${sourceColor}55`,
            isCurrent,
            stepNum: step.num,
            fieldsPreview: fieldsPreview.slice(0, 4), // show top 4 fields max for a clean fit
            msgType,
          },
        });
      } else if (step.source) {
        // Internal processing step (self-loop/note)
        const p = PARTICIPANTS.find(part => part.id === step.source);
        const pColor = p ? p.stroke : '#6366f1';
        
        // Place the internal box on the side of the lifeline
        // If it's ACS, place to the left, otherwise to the right to avoid offscreen clipping
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
          },
          draggable: false,
        });

        // Add a small anchor point on the lifeline for internal reference
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

    return { nodes: nodesList, edges: edgesList };
  }, [scenario, activeSteps, currentStepIndex, theme]);

  // Click on any node: switch the details context to whatever was clicked
  const onNodeClick = (_: any, node: Node) => {
    setIsRightCollapsed(false); // always slide open the right panel on any click

    // Domain containers
    if (node.id === 'domain_acquirer') {
      setDetailsContext({ kind: 'domain', domainId: 'acquirer' });
      return;
    }
    if (node.id === 'domain_interop') {
      setDetailsContext({ kind: 'domain', domainId: 'interop' });
      return;
    }
    if (node.id === 'domain_issuer') {
      setDetailsContext({ kind: 'domain', domainId: 'issuer' });
      return;
    }

    // Step group bands
    if (node.id.startsWith('stepgroup_')) {
      const groupId = node.id.replace('stepgroup_', '') as StepGroupId;
      setDetailsContext({ kind: 'group', groupId });
      return;
    }

    // Participant headers — show participant overview
    if (node.id.startsWith('header_')) {
      const participantId = node.id.replace('header_', '') as ParticipantId;
      setDetailsContext({ kind: 'participant', participantId });
      return;
    }

    // Lifeline anchors and internal step nodes
    // The flow step id is in the node id
    const stepId = node.id
      .replace('internal_', '')
      .replace('anchor_source_', '')
      .replace('anchor_target_', '');

    const clickedIdx = activeSteps.findIndex(s => s.id === stepId);
    if (clickedIdx !== -1) {
      setIsPlaying(false);
      setCurrentStepIndex(clickedIdx);
      setDetailsContext({ kind: 'step', stepId });
    }
  };

  const onEdgeClick = (_: any, edge: Edge) => {
    setIsRightCollapsed(false);

    // Message edges link to flow steps
    if (edge.id.startsWith('msg_edge_')) {
      const stepId = edge.id.replace('msg_edge_', '');
      const clickedIdx = activeSteps.findIndex(s => s.id === stepId);
      if (clickedIdx !== -1) {
        setIsPlaying(false);
        setCurrentStepIndex(clickedIdx);
        setDetailsContext({ kind: 'step', stepId });
      }
      return;
    }

    // Lifeline edges — clicking the vertical dashed line shows the participant overview
    if (edge.id.startsWith('lifeline_edge_')) {
      const participantId = edge.id.replace('lifeline_edge_', '') as ParticipantId;
      setDetailsContext({ kind: 'participant', participantId });
    }
  };

  const handleStepSelectFromTimeline = (idx: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(idx);
    setIsRightCollapsed(false);
    const step = activeSteps[idx];
    if (step) {
      setDetailsContext({ kind: 'step', stepId: step.id });
    }
  };

  // Open the glossary in the details panel
  const openGlossary = () => {
    setIsRightCollapsed(false);
    setDetailsContext({ kind: 'glossary' });
  };

  const jumpToGroup = (groupId: StepGroupId) => {
    const idx = activeSteps.findIndex((step) => step.groupId === groupId);
    if (idx !== -1) {
      handleStepSelectFromTimeline(idx);
    }
  };

  const applyScenarioPreset = (preset: ScenarioPreset) => {
    setScenario(preset.scenario);
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setHiddenGroups(new Set());
    setDetailsContext({ kind: 'step', stepId: 'step_0A' });
    setIsLeftCollapsed(false);
    setIsRightCollapsed(false);
  };

  const copyShareLink = async () => {
    const url = buildShareUrl({
      scenario,
      currentStepIndex,
      hiddenGroups: [...hiddenGroups],
      theme,
      securityLensEnabled,
      scenarioToolbarCollapsed: isScenarioToolbarCollapsed,
    });

    window.history.replaceState({}, '', url);
    await navigator.clipboard.writeText(url.toString());
    setShareCopied(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Compact Top Bar */}
      <header className="app-header">
        <div className="header-brand">
          <Shield size={16} className="logo-icon" />
          <span className="header-title">EMV 3DS Protocol Lab</span>
          <span className="header-divider" />
          <span className="spec-badge">v{scenario.protocolVersion}</span>
          <span className={`header-chip header-chip-status status-${scenario.transStatus.toLowerCase()}`}>
            {scenario.transStatus}
          </span>
          {securityLensEnabled && (
            <span className="header-chip" style={{ color: 'var(--accent-secondary)', borderColor: 'rgba(155, 200, 66, 0.34)', background: 'rgba(155, 200, 66, 0.08)' }}>
              Research Lens
            </span>
          )}
        </div>

        <div className="header-phase-rail">
          {activeGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={`phase-pill ${currentGroupMeta?.id === group.id ? 'active' : ''}`}
              onClick={() => jumpToGroup(group.id)}
              title={group.description}
            >
              <span className="phase-pill-swatch" style={{ background: group.color }} />
              <span>{group.title}</span>
            </button>
          ))}
        </div>

        <div className="header-actions">
          <span className="header-step-indicator">
            {currentStepIndex + 1}<span className="step-sep">/</span>{activeSteps.length}
          </span>
          <button
            onClick={() => void copyShareLink()}
            className="header-action-btn"
            title="Copy a permalink for the current scenario state"
          >
            <Link2 size={14} />
            <span>{shareCopied ? 'Copied' : 'Share'}</span>
          </button>
          <button
            onClick={() => setSecurityLensEnabled((prev) => !prev)}
            className="header-action-btn"
            title={securityLensEnabled ? 'Disable Security Research Lens' : 'Enable Security Research Lens'}
            style={securityLensEnabled ? {
              color: 'var(--accent-secondary)',
              borderColor: 'rgba(155, 200, 66, 0.35)',
              background: 'rgba(155, 200, 66, 0.08)'
            } : undefined}
          >
            <Crosshair size={14} />
          </button>
          <button
            onClick={openGlossary}
            className="header-action-btn"
            title="Open 3DS Glossary & Reference"
          >
            <BookOpen size={14} />
          </button>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <section className={`scenario-toolbar ${isScenarioToolbarCollapsed ? 'collapsed' : ''}`}>
        <div className="scenario-toolbar-row">
          <button
            type="button"
            className="scenario-toolbar-toggle"
            onClick={() => setIsScenarioToolbarCollapsed((prev) => !prev)}
            title={isScenarioToolbarCollapsed ? 'Expand scenario catalog' : 'Collapse scenario catalog'}
            aria-expanded={!isScenarioToolbarCollapsed}
          >
            <Sparkles size={12} />
            <span className="scenario-toolbar-kicker">Scenario</span>
            {isScenarioToolbarCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
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
            setScenario={setScenario}
            currentStepIndex={currentStepIndex}
            setCurrentStepIndex={handleStepSelectFromTimeline}
            totalSteps={activeSteps.length}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            playSpeed={playSpeed}
            setPlaySpeed={setPlaySpeed}
            activeStepLabel={currentStep?.label || ''}
            activeStepNum={currentStep?.num || ''}
            activeSteps={activeSteps}
          />
        </aside>

        {/* Center Panel (React Flow sequence diagram) */}
        <section className="canvas-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Floating Collapsible Sidebar Toggle Buttons */}
          <button 
            className="panel-toggle-btn left"
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            title={isLeftCollapsed ? "Expand Left Panel" : "Collapse Left Panel"}
          >
            {isLeftCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <button 
            className="panel-toggle-btn right"
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            title={isRightCollapsed ? "Expand Right Panel" : "Collapse Right Panel"}
          >
            {isRightCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          <button
            className="canvas-fit-btn"
            onClick={() => fitView({ padding: 0.12, duration: 250 })}
            title="Fit diagram to view"
          >
            Fit
          </button>

          <div className="canvas-flow-shell">
            {activeSteps.length === 0 && (
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
                  <Eye size={12} />
                  <span>Show all phases</span>
                </button>
              </div>
            )}

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
            >
              {/* xyflow v12 Background: use `bgColor` prop (highest-priority in
                  the 3-tier fallback: bgColor → --xy-background-color →
                  --xy-background-color-default). Without this, dark mode
                  ships a solid #141414 background that obscures any node
                  with zIndex < 0. Setting bgColor: 'transparent' hands
                  control back to the .canvas-panel gradient below. */}
              <Background
                color={theme === 'dark' ? '#1a1a1f' : '#e2e8f0'}
                bgColor="transparent"
                gap={16}
                size={1}
                variant={BackgroundVariant.Lines}
              />
              <ReactFlowControls position="bottom-right" />
              <MiniMap
                nodeColor={() => (theme === 'dark' ? '#27272a' : '#cbd5e1')}
                zoomable
                pannable
                position="bottom-left"
              />
            </ReactFlow>

            {/* Live Browser Fingerprinting Scanner Terminal (Steps 3b–4d) */}
            {isProfilingActive && <BrowserFingerprintWidget />}

            {/* Visual Legend */}
            <div className="canvas-legend">
              <div className="legend-header">
                <h4 className="legend-title">Step Groups (Phases)</h4>
                <div className="legend-header-actions">
                  <button
                    type="button"
                    className="legend-mini-btn"
                    onClick={showAllGroups}
                    disabled={hiddenGroups.size === 0}
                    title="Show all phases"
                  >
                    <Eye size={11} />
                    <span>All</span>
                  </button>
                  <button
                    type="button"
                    className="legend-mini-btn"
                    onClick={hideAllGroups}
                    disabled={hiddenGroups.size === activeGroups.length}
                    title="Hide all phases"
                  >
                    <EyeOff size={11} />
                    <span>None</span>
                  </button>
                </div>
              </div>
              <div className="legend-items legend-groups">
                {STEP_GROUPS.map((g) => {
                  const isHidden = hiddenGroups.has(g.id);
                  const inActive = activeGroups.some((ag) => ag.id === g.id);
                  // "Isolated" = this group is visible AND every other group is hidden
                  const isIsolated =
                    !isHidden &&
                    STEP_GROUPS.filter((other) => other.id !== g.id).every(
                      (other) => hiddenGroups.has(other.id)
                    ) &&
                    hiddenGroups.size > 0;
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
                        aria-label={isIsolated ? 'Show all phases' : `Isolate ${g.title} phase`}
                      >
                        <Crosshair size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {hiddenGroups.size > 0 && (
                <div className="legend-hidden-banner">
                  {hiddenGroups.size} phase{hiddenGroups.size === 1 ? '' : 's'} hidden — click an entry above to show.
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
            context={detailsContext}
            securityLensEnabled={securityLensEnabled}
            onShowStep={(stepId) => {
              const idx = activeSteps.findIndex(s => s.id === stepId);
              if (idx !== -1) {
                setCurrentStepIndex(idx);
                setDetailsContext({ kind: 'step', stepId });
              }
            }}
            onShowGlossary={openGlossary}
            onShowGroup={(groupId) => setDetailsContext({ kind: 'group', groupId })}
            onShowParticipant={(participantId) => setDetailsContext({ kind: 'participant', participantId })}
            onShowDomain={(domainId) => setDetailsContext({ kind: 'domain', domainId })}
          />
        </aside>
      </main>
    </div>
  );
}

function BrowserFingerprintWidget() {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        return p + 4;
      });
    }, 80);

    return () => {
      clearInterval(dotInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const browserData = useMemo(() => {
    return {
      userAgent: navigator.userAgent.substring(0, 65) + '...',
      language: navigator.language || 'en-US',
      screenRes: `${window.screen.width} x ${window.screen.height}`,
      colorDepth: `${window.screen.colorDepth}-bit`,
      tzOffset: `${new Date().getTimezoneOffset()} mins`,
      java: navigator.javaEnabled() ? 'Yes' : 'No',
      cookies: navigator.cookieEnabled ? 'Enabled' : 'Disabled',
    };
  }, []);

  return (
    <div className="fingerprint-widget fade-in">
      <div className="widget-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="live-indicator pulsing" />
          <span style={{ fontWeight: '800', letterSpacing: '0.05em', color: '#10b981' }}>ACS LIVE PROFILER</span>
        </div>
        <span style={{ fontSize: '9px', opacity: 0.6 }}>threeDSMethodData POST</span>
      </div>
      
      <div className="widget-progress-container">
        <div className="widget-progress-label">
          <span>{progress < 100 ? `Fingerprinting browser${dots}` : 'Device Fingerprinted successfully'}</span>
          <span>{progress}%</span>
        </div>
        <div className="widget-progress-bar-bg">
          <div className="widget-progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="widget-grid">
        <div className="widget-field">
          <span className="field-label">User-Agent</span>
          <span className="field-value font-mono" style={{ fontSize: '9px' }}>{browserData.userAgent}</span>
        </div>
        <div className="widget-row">
          <div className="widget-field">
            <span className="field-label">Language</span>
            <span className="field-value font-mono">{browserData.language}</span>
          </div>
          <div className="widget-field">
            <span className="field-label">Screen Res</span>
            <span className="field-value font-mono">{browserData.screenRes}</span>
          </div>
        </div>
        <div className="widget-row">
          <div className="widget-field">
            <span className="field-label">Color Depth</span>
            <span className="field-value font-mono">{browserData.colorDepth}</span>
          </div>
          <div className="widget-field">
            <span className="field-label">Timezone Offset</span>
            <span className="field-value font-mono">{browserData.tzOffset}</span>
          </div>
        </div>
        <div className="widget-row">
          <div className="widget-field">
            <span className="field-label">Java Enabled</span>
            <span className="field-value font-mono">{browserData.java}</span>
          </div>
          <div className="widget-field">
            <span className="field-label">Cookies</span>
            <span className="field-value font-mono">{browserData.cookies}</span>
          </div>
        </div>
      </div>
      <div className="widget-footer">
        ACS collects and stores these parameters with threeDSServerTransID for risk scoring in Step 8a.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
