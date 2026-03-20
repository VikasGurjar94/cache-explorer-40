import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CacheStateValue,
  BusTransaction,
  BusTransactionType,
  LogEntry,
} from '@/lib/simulator/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusVisualizerProps {
  coreCount: number;
  busTransactions: BusTransaction[];
  stateChanges: LogEntry['stateChanges'];
  activeStep: number;
}

type Highlight = {
  invalidated: number[];
  shared: number[];
  modified: number[];
  sender: number | null;
};

type BusStage  = 'idle' | 'toBus' | 'bus' | 'toCores';
type PlayState = 'idle' | 'playing' | 'paused' | 'done';
type Speed     = 0.5 | 1 | 2;

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Base timing values at 1× speed (ms).
 * Kept generous so each phase is clearly visible before the next begins.
 * The speed multiplier divides these, so 2× = half the duration.
 */
const BASE_TIMING = {
  DOT_SETTLE:       80,  // pause before dot leaves the sender core
  CORE_TO_BUS:     650,  // dot travels: core → bus
  BUS_DWELL:       500,  // dot sits on bus while label pulses
  BUS_LABEL_REVEAL: 350, // extra wait for the tx label to "sink in"
  BUS_SETTLE:      150,  // pause after highlights are applied
  CORE_STEP:       650,  // dot travels: bus → each target core
  CORE_TAIL:       450,  // pause after reaching the last core
  TX_GAP:          250,  // gap between back-to-back transactions
} as const;

const SPEED_OPTIONS: { value: Speed; label: string }[] = [
  { value: 0.5, label: '0.5×' },
  { value: 1,   label: '1×'   },
  { value: 2,   label: '2×'   },
];

const TX_LABELS: Partial<Record<BusTransactionType, string>> = {
  WriteBack: 'WriteBack',
};

const PHASE_STEPS: { stage: BusStage; label: string }[] = [
  { stage: 'toBus',   label: 'Core → Bus'    },
  { stage: 'bus',     label: 'Bus broadcast' },
  { stage: 'toCores', label: 'Bus → Cores'   },
];

// Tailwind colour class per MESI(O) state
const STATE_COLORS: Record<string, string> = {
  M: 'text-red-500',
  E: 'text-emerald-500',
  S: 'text-blue-500',
  O: 'text-amber-500',
  I: 'text-rose-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txLabel(type: BusTransactionType): string {
  return TX_LABELS[type] ?? type;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ─── Inline SVG icons (no extra deps) ────────────────────────────────────────

function IconPlay() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
      <path d="M2.5 1.5l7 4-7 4V1.5z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
      <rect x="1.5" y="1.5" width="3" height="8" rx="1" />
      <rect x="6.5" y="1.5" width="3" height="8" rx="1" />
    </svg>
  );
}

function IconReplay() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 2v4H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BusVisualizer({
  coreCount,
  busTransactions,
  stateChanges,
  activeStep,
}: BusVisualizerProps) {
  // DOM refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const coreRefs     = useRef<Array<HTMLDivElement | null>>([]);
  const busRef       = useRef<HTMLDivElement | null>(null);

  // Visual state
  const [activeTxType, setActiveTxType] = useState<BusTransactionType | null>(null);
  const [busStage, setBusStage]         = useState<BusStage>('idle');
  const [dot, setDot]                   = useState<{ visible: boolean; x: number; y: number }>({
    visible: false, x: 0, y: 0,
  });
  const [highlight, setHighlight] = useState<Highlight>({
    invalidated: [], shared: [], modified: [], sender: null,
  });

  // Playback state
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [speed, setSpeed]         = useState<Speed>(1);

  /**
   * Incrementing `playGen` is the only thing that (re)starts the animation
   * effect. This cleanly separates "start/restart" from "pause/resume", which
   * are handled entirely via refs without triggering a re-run of the effect.
   */
  const [playGen, setPlayGen] = useState(-1);

  // Refs for cross-render pause ↔ resume communication with the async IIFE
  const isPausedRef    = useRef(true);
  const resumeRef      = useRef<(() => void) | null>(null);
  const speedRef       = useRef<Speed>(1);
  const reduceMotionRef = useRef(false);

  // Keep speedRef in sync (the IIFE reads it on every sleep() call)
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Trim stale core refs whenever coreCount shrinks
  useEffect(() => {
    coreRefs.current = coreRefs.current.slice(0, coreCount);
  }, [coreCount]);

  // Subscribe to OS reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    reduceMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { reduceMotionRef.current = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Derived maps
  const newStateByCore = useMemo(() => {
    const map = new Map<number, CacheStateValue>();
    for (const ch of stateChanges ?? []) map.set(ch.coreId, ch.newState);
    return map;
  }, [stateChanges]);

  const { invalidated, shared, modified } = useMemo(() => {
    const changes = stateChanges ?? [];
    return {
      invalidated: unique(changes.filter((c) => c.newState === 'I').map((c) => c.coreId)),
      shared:      unique(changes.filter((c) => ['S','E','O'].includes(c.newState)).map((c) => c.coreId)),
      modified:    unique(changes.filter((c) => c.newState === 'M').map((c) => c.coreId)),
    };
  }, [stateChanges]);

  // Resolve which cores are affected by each transaction type
  const getTargets = useCallback((tx: BusTransaction): number[] => {
    switch (tx.type) {
      case 'BusRd':
        return shared;
      case 'BusRdX':
      case 'BusUpgr':
        return unique([...invalidated, ...modified]);
      case 'WriteBack':
        return (stateChanges ?? [])
          .filter((c) => c.coreId === tx.initiator && c.oldState === 'M')
          .map((c) => c.coreId);
      default:
        return [];
    }
  }, [invalidated, shared, modified, stateChanges]);

  // ── Reset when the timeline step changes ───────────────────────────────────
  useEffect(() => {
    setActiveTxType(null);
    setBusStage('idle');
    setHighlight({ invalidated: [], shared: [], modified: [], sender: null });
    setDot((d) => ({ ...d, visible: false }));
    setPlayState('idle');
    setPlayGen(-1);
    isPausedRef.current = true;
    resumeRef.current   = null;
  }, [activeStep]);

  // ── Main animation loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (playGen < 0 || busTransactions.length === 0 || !containerRef.current) return;

    const busRect = busRef.current?.getBoundingClientRect();
    if (!busRect) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const toLocal = (r: DOMRect) => ({
      x: r.left + r.width  / 2 - containerRect.left,
      y: r.top  + r.height / 2 - containerRect.top,
    });

    const coreCenters = Array.from({ length: coreCount }, (_, i) => {
      const el = coreRefs.current[i];
      return el ? toLocal(el.getBoundingClientRect()) : null;
    });
    const busCenter = toLocal(busRect);

    const cancelled = { current: false };
    const timeouts:  number[]  = [];

    /**
     * sleep() respects the live speed and pause state.
     *
     * If the component is paused when the timeout fires, `resolve` is stored
     * in `resumeRef`. The Play/Resume handler calls it later, waking the IIFE
     * without any polling.
     */
    const sleep = (baseMs: number): Promise<void> =>
      new Promise<void>((resolve) => {
        const scaled = Math.max(1, Math.round(baseMs / speedRef.current));
        const id = window.setTimeout(() => {
          if (cancelled.current) return;
          if (isPausedRef.current) {
            resumeRef.current = resolve; // suspend the IIFE
          } else {
            resolve();
          }
        }, scaled);
        timeouts.push(id);
      });

    // Reduced-motion: skip animation, show final result immediately
    if (reduceMotionRef.current) {
      const tx = busTransactions[0];
      setActiveTxType(tx?.type ?? null);
      setBusStage('bus');
      setHighlight({ invalidated, shared, modified, sender: tx?.initiator ?? null });
      setPlayState('done');
      return () => { cancelled.current = true; timeouts.forEach(clearTimeout); };
    }

    void (async () => {
      for (const tx of busTransactions) {
        if (cancelled.current) return;

        const sender       = tx.initiator;
        const senderCenter = coreCenters[sender] ?? busCenter;

        // ── Phase 1: Core → Bus ────────────────────────────────────────────
        setActiveTxType(tx.type);
        setBusStage('toBus');
        setHighlight((h) => ({ ...h, sender }));
        setDot({ visible: true, ...senderCenter });
        await sleep(BASE_TIMING.DOT_SETTLE);
        setDot({ visible: true, ...busCenter });
        setBusStage('bus');
        await sleep(BASE_TIMING.CORE_TO_BUS);

        // ── Phase 2: Bus dwell + label reveal ─────────────────────────────
        await sleep(BASE_TIMING.BUS_DWELL);
        await sleep(BASE_TIMING.BUS_LABEL_REVEAL);

        // ── Phase 3: Apply per-core highlights ────────────────────────────
        const targets          = getTargets(tx);
        const invalidationsNow = unique(targets.filter((id) => newStateByCore.get(id) === 'I'));
        const modifiedNow      = unique(targets.filter((id) => newStateByCore.get(id) === 'M'));
        const sharedNow        = unique(targets.filter((id) => {
          const s = newStateByCore.get(id);
          return s === 'S' || s === 'E' || s === 'O';
        }));

        setHighlight({ invalidated: invalidationsNow, shared: sharedNow, modified: modifiedNow, sender });
        setBusStage('toCores');
        await sleep(BASE_TIMING.BUS_SETTLE);

        // ── Phase 4: Dot visits each affected core ─────────────────────────
        const validTargets = targets.filter((id) => coreCenters[id] !== null);
        if (validTargets.length === 0) {
          setDot({ visible: true, ...busCenter });
          await sleep(BASE_TIMING.CORE_TAIL);
        } else {
          for (const tid of validTargets) {
            if (cancelled.current) return;
            setDot({ visible: true, ...coreCenters[tid]! });
            await sleep(BASE_TIMING.CORE_STEP);
          }
        }

        // Reset between transactions
        setDot((d) => ({ ...d, visible: false }));
        setBusStage('idle');
        await sleep(BASE_TIMING.TX_GAP);
      }

      if (!cancelled.current) {
        setPlayState('done');
      }
    })();

    return () => {
      cancelled.current = true;
      timeouts.forEach(clearTimeout);
    };
  }, [playGen, busTransactions, coreCount, newStateByCore, invalidated, shared, modified, getTargets]);

  // ── Playback handler ───────────────────────────────────────────────────────

  const handlePlayPause = useCallback(() => {
    if (playState === 'idle' || playState === 'done') {
      // (Re)start from scratch
      setActiveTxType(null);
      setBusStage('idle');
      setHighlight({ invalidated: [], shared: [], modified: [], sender: null });
      setDot((d) => ({ ...d, visible: false }));
      isPausedRef.current = false;
      resumeRef.current   = null;
      setPlayState('playing');
      setPlayGen((g) => g + 1);
    } else if (playState === 'playing') {
      // Pause — IIFE stays alive; it will block on the next sleep()
      isPausedRef.current = true;
      setPlayState('paused');
    } else {
      // Resume — wake the stored resolve from the suspended sleep()
      isPausedRef.current = false;
      const resume = resumeRef.current;
      resumeRef.current   = null;
      resume?.();
      setPlayState('playing');
    }
  }, [playState]);

  // ── Derived UI values ──────────────────────────────────────────────────────

  const hasTransactions = busTransactions.length > 0;
  const currentPhaseIdx = PHASE_STEPS.findIndex((p) => p.stage === busStage);
  const dotTransitionMs = Math.round(BASE_TIMING.CORE_STEP / speed);

  const playButtonLabel =
    playState === 'done'    ? 'Replay'  :
    playState === 'playing' ? 'Pause'   :
    playState === 'paused'  ? 'Resume'  : 'Play';

  const PlayIcon =
    playState === 'done'    ? IconReplay :
    playState === 'playing' ? IconPause  : IconPlay;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-3">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Coherence Bus
          </div>
          <div className="mt-1 text-sm font-semibold">Cause → effect across cores</div>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {hasTransactions && activeTxType ? txLabel(activeTxType) : 'Idle'}
        </Badge>
      </div>

      {/* ── Phase progress bar ─────────────────────────────────────────────── */}
      {hasTransactions && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            {PHASE_STEPS.map((phase, idx) => {
              const isActive = busStage === phase.stage;
              const isDone   = currentPhaseIdx > idx;
              return (
                <div key={phase.stage} className="flex items-center gap-1 flex-1 min-w-0">
                  <div
                    className={[
                      'h-1 flex-1 rounded-full transition-all duration-500',
                      isActive ? 'bg-emerald-500' :
                      isDone   ? 'bg-emerald-300 dark:bg-emerald-700' :
                                 'bg-muted',
                    ].join(' ')}
                  />
                  {idx < PHASE_STEPS.length - 1 && (
                    <div
                      className={[
                        'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-500',
                        isActive || isDone ? 'bg-emerald-400' : 'bg-muted',
                      ].join(' ')}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono text-right">
            {busStage !== 'idle'
              ? `${currentPhaseIdx + 1} / ${PHASE_STEPS.length} — ${PHASE_STEPS[currentPhaseIdx]?.label ?? ''}`
              : playState === 'done'
              ? 'Complete'
              : 'Waiting'}
          </div>
        </div>
      )}

      {/* ── Visualization canvas ────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex items-center gap-3 justify-center relative select-none"
        style={{ paddingTop: '2.5rem', paddingBottom: '0.5rem' }}
        role="img"
        aria-label={`Cache coherence bus visualization, ${coreCount} cores`}
      >
        {/* Core circles */}
        {Array.from({ length: coreCount }, (_, i) => {
          const newState      = newStateByCore.get(i) ?? null;
          const isInvalidated = highlight.invalidated.includes(i);
          const isModified    = highlight.modified.includes(i);
          const isShared      = highlight.shared.includes(i);
          const isSender      = highlight.sender === i;

          const circleStyle: CSSProperties = (() => {
            if (isInvalidated) return { borderColor: 'rgb(244,63,94)',  background: 'rgba(244,63,94,0.15)'  };
            if (isModified)    return { borderColor: 'rgb(239,68,68)',  background: 'rgba(239,68,68,0.15)'  };
            if (isShared) {
              if (newState === 'E') return { borderColor: 'rgb(16,185,129)', background: 'rgba(16,185,129,0.12)' };
              if (newState === 'S') return { borderColor: 'rgb(59,130,246)', background: 'rgba(59,130,246,0.12)' };
              /* O */               return { borderColor: 'rgb(245,158,11)', background: 'rgba(245,158,11,0.13)' };
            }
            if (isSender) return { borderColor: 'rgb(16,185,129)', background: 'rgba(16,185,129,0.08)' };
            return {};
          })();

          const shouldPulse = isInvalidated || (isSender && busStage !== 'idle');

          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                ref={(el) => { coreRefs.current[i] = el; }}
                className={[
                  'h-11 w-11 rounded-full border-2 flex items-center justify-center',
                  'font-mono text-xs font-semibold transition-all duration-300',
                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100',
                  shouldPulse ? 'animate-pulse' : '',
                ].join(' ')}
                style={circleStyle}
                aria-label={`Core ${i}${newState ? `, state ${newState}` : ''}`}
              >
                C{i}
              </div>

              {/* MESI(O) state badge — coloured per state */}
              <span
                className={[
                  'text-[10px] font-mono font-bold transition-colors duration-300',
                  newState
                    ? (STATE_COLORS[newState] ?? 'text-muted-foreground')
                    : 'text-transparent',
                ].join(' ')}
                aria-hidden="true"
              >
                {newState ?? 'X'}
              </span>

              <span className="text-[10px] text-muted-foreground">Core {i}</span>
            </div>
          );
        })}

        {/* Bus label */}
        <div
          ref={busRef}
          className={[
            'absolute rounded-full border bg-card px-3 py-1 text-xs font-mono',
            'transition-all duration-300',
            busStage === 'bus'
              ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400 animate-pulse'
              : 'border-border text-muted-foreground',
          ].join(' ')}
          style={{ left: '50%', transform: 'translateX(-50%) translateY(-2.5rem)' }}
          aria-live="polite"
          aria-label={`Bus: ${activeTxType ? txLabel(activeTxType) : 'idle'}`}
        >
          {activeTxType ? txLabel(activeTxType) : 'Bus'}
        </div>

        {/* Signal dot — GPU-composited transform, hidden from a11y tree */}
        {dot.visible && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              width: 13,
              height: 13,
              borderRadius: '50%',
              background: 'hsl(142, 71%, 45%)',
              top: 0,
              left: 0,
              transform: `translate(${dot.x - 6.5}px, ${dot.y - 6.5}px)`,
              transition: `transform ${dotTransitionMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              boxShadow: '0 0 0 4px rgba(16,185,129,0.2), 0 0 14px rgba(16,185,129,0.45)',
            }}
          />
        )}
      </div>

      {/* ── Playback controls ───────────────────────────────────────────────── */}
      {hasTransactions && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">

          {/* Play / Pause / Resume / Replay */}
          <button
            onClick={handlePlayPause}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'border transition-colors',
              playState === 'playing'
                ? 'border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900'
                : 'border-border bg-background text-foreground hover:bg-muted',
            ].join(' ')}
            aria-label={`${playButtonLabel} animation`}
          >
            <PlayIcon />
            {playButtonLabel}
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-muted-foreground">Speed</span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {SPEED_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSpeed(value)}
                  className={[
                    'px-2.5 py-1 text-[11px] font-mono transition-colors',
                    speed === value
                      ? 'bg-foreground text-background'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  ].join(' ')}
                  aria-label={`Set speed to ${label}`}
                  aria-pressed={speed === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Status footer ───────────────────────────────────────────────────── */}
      <div className="text-xs font-mono text-muted-foreground space-y-0.5">
        {hasTransactions ? (
          <>
            <div className="flex items-center gap-1.5">
              <span
                className={[
                  'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300',
                  playState === 'playing' && busStage !== 'idle' ? 'bg-emerald-500' :
                  playState === 'paused'                         ? 'bg-amber-400'   :
                                                                   'bg-muted-foreground/30',
                ].join(' ')}
              />
              {playState === 'idle'    && 'Press Play to animate'}
              {playState === 'playing' && (busStage === 'idle'
                ? 'Starting…'
                : (PHASE_STEPS.find((p) => p.stage === busStage)?.label ?? ''))}
              {playState === 'paused'  && 'Paused — press Resume to continue'}
              {playState === 'done'    && 'Animation complete'}
            </div>
            <div>
              {activeTxType ? `Type: ${txLabel(activeTxType)}` : 'Type: —'}
              {busTransactions[0]?.initiator !== undefined
                ? ` | Initiator: Core ${busTransactions[0].initiator}`
                : ''}
            </div>
          </>
        ) : (
          <div>No bus traffic for this step.</div>
        )}
      </div>
    </div>
  );
}