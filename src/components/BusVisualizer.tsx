import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import { Cpu } from 'lucide-react';
import {
  CacheStateValue,
  BusTransaction,
  BusTransactionType,
  LogEntry,
  CoreCache
} from '@/lib/simulator/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusVisualizerProps {
  coreCount: number;
  busTransactions: BusTransaction[];
  stateChanges: LogEntry['stateChanges'];
  activeStep: number;
  caches: CoreCache[];
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

const BASE_TIMING = {
  DOT_SETTLE:       60,
  CORE_TO_BUS:     550,
  BUS_DWELL:       400,
  BUS_LABEL_REVEAL: 250,
  BUS_SETTLE:      120,
  CORE_STEP:       550,
  CORE_TAIL:       350,
  TX_GAP:          150,
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

// ─── Inline SVG icons ────────────────────────────────────────────────────────

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
  caches,
}: BusVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const coreRefs     = useRef<Array<HTMLDivElement | null>>([]);
  const busRef       = useRef<HTMLDivElement | null>(null);

  const [activeTxType, setActiveTxType] = useState<BusTransactionType | null>(null);
  const [busStage, setBusStage]         = useState<BusStage>('idle');
  const [dot, setDot]                   = useState<{ visible: boolean; x: number; y: number }>({
    visible: false, x: 0, y: 0,
  });
  const [highlight, setHighlight] = useState<Highlight>({
    invalidated: [], shared: [], modified: [], sender: null,
  });

  const [playState, setPlayState] = useState<PlayState>('idle');
  const [speed, setSpeed]         = useState<Speed>(1);
  const [playGen, setPlayGen]     = useState(-1);

  const [centers, setCenters] = useState<{ cores: {x: number, y: number}[], bus: {x: number, y: number} | null }>({ cores: [], bus: null });

  const isPausedRef     = useRef(true);
  const resumeRef       = useRef<(() => void) | null>(null);
  const speedRef        = useRef<Speed>(1);
  const reduceMotionRef = useRef(false);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    coreRefs.current = coreRefs.current.slice(0, coreCount);
  }, [coreCount]);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    reduceMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { reduceMotionRef.current = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useLayoutEffect(() => {
    const updateCenters = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const toLocal = (r: DOMRect) => ({
        x: r.left + r.width  / 2 - containerRect.left,
        y: r.top  + r.height / 2 - containerRect.top,
      });

      const newCoreCenters = Array.from({ length: coreCount }).map((_, i) => {
        const el = coreRefs.current[i];
        return el ? toLocal(el.getBoundingClientRect()) : { x: 0, y: 0 };
      });
      const newBusCenter = busRef.current ? toLocal(busRef.current.getBoundingClientRect()) : null;

      setCenters({ cores: newCoreCenters, bus: newBusCenter });
    };

    updateCenters();
    // Re-measure after a small delay to ensure rendering completes
    const timer = setTimeout(updateCenters, 50);
    window.addEventListener('resize', updateCenters);
    return () => {
      window.removeEventListener('resize', updateCenters);
      clearTimeout(timer);
    };
  }, [coreCount, caches]); // caches trigger re-measure if height changes

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

  useEffect(() => {
    if (playGen < 0 || busTransactions.length === 0 || !containerRef.current || !busRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const toLocal = (r: DOMRect) => ({
      x: r.left + r.width  / 2 - containerRect.left,
      y: r.top  + r.height / 2 - containerRect.top,
    });

    const currentCoreCenters = Array.from({ length: coreCount }, (_, i) => {
      const el = coreRefs.current[i];
      return el ? toLocal(el.getBoundingClientRect()) : null;
    });
    const currentBusCenter = toLocal(busRef.current.getBoundingClientRect());

    const cancelled = { current: false };
    const timeouts:  number[]  = [];

    const sleep = (baseMs: number): Promise<void> =>
      new Promise<void>((resolve) => {
        const scaled = Math.max(1, Math.round(baseMs / speedRef.current));
        const id = window.setTimeout(() => {
          if (cancelled.current) return;
          if (isPausedRef.current) {
            resumeRef.current = resolve;
          } else {
            resolve();
          }
        }, scaled);
        timeouts.push(id);
      });

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
        const senderCenter = currentCoreCenters[sender] ?? currentBusCenter;

        setActiveTxType(tx.type);
        setBusStage('toBus');
        setHighlight((h) => ({ ...h, sender }));
        setDot({ visible: true, ...senderCenter });
        await sleep(BASE_TIMING.DOT_SETTLE);
        setDot({ visible: true, ...currentBusCenter });
        setBusStage('bus');
        await sleep(BASE_TIMING.CORE_TO_BUS);

        await sleep(BASE_TIMING.BUS_DWELL);
        await sleep(BASE_TIMING.BUS_LABEL_REVEAL);

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

        const validTargets = targets.filter((id) => currentCoreCenters[id] !== null);
        if (validTargets.length === 0) {
          setDot({ visible: true, ...currentBusCenter });
          await sleep(BASE_TIMING.CORE_TAIL);
        } else {
          for (const tid of validTargets) {
            if (cancelled.current) return;
            setDot({ visible: true, ...currentCoreCenters[tid]! });
            await sleep(BASE_TIMING.CORE_STEP);
          }
        }

        setDot((d) => ({ ...d, visible: false }));
        setBusStage('idle');
        await sleep(BASE_TIMING.TX_GAP);
      }

      if (!cancelled.current) {
        setHighlight({ invalidated: [], shared: [], modified: [], sender: null });
        setBusStage('idle');
        setActiveTxType(null);
        setPlayState('done');
      }
    })();

    return () => {
      cancelled.current = true;
      timeouts.forEach(clearTimeout);
    };
  }, [playGen, busTransactions, coreCount, newStateByCore, invalidated, shared, modified, getTargets]);

  const handlePlayPause = useCallback(() => {
    if (playState === 'idle' || playState === 'done') {
      setActiveTxType(null);
      setBusStage('idle');
      setHighlight({ invalidated: [], shared: [], modified: [], sender: null });
      setDot((d) => ({ ...d, visible: false }));
      isPausedRef.current = false;
      resumeRef.current   = null;
      setPlayState('playing');
      setPlayGen((g) => g + 1);
    } else if (playState === 'playing') {
      isPausedRef.current = true;
      setPlayState('paused');
    } else {
      isPausedRef.current = false;
      const resume = resumeRef.current;
      resumeRef.current   = null;
      resume?.();
      setPlayState('playing');
    }
  }, [playState]);

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

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">

      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            Coherence Bus
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-800">Cause → effect across system cores</div>
        </div>
        <Badge variant="secondary" className="font-mono text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
          {hasTransactions && activeTxType ? txLabel(activeTxType) : 'Idle'}
        </Badge>
      </div>

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
                      isActive ? 'bg-indigo-500' :
                      isDone   ? 'bg-indigo-300' :
                                 'bg-slate-200',
                    ].join(' ')}
                  />
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-500 font-mono text-right font-semibold">
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
        className="flex flex-wrap items-start gap-6 lg:gap-8 justify-center relative select-none my-6 w-full min-h-[220px]"
        style={{ paddingTop: '5.5rem', paddingBottom: '3rem' }}
        role="img"
        aria-label={`Cache coherence bus visualization, ${coreCount} cores`}
      >
        {/* SVG connection lines overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {centers.bus && centers.cores.map((coreCenter, i) => {
            const isInvalidated = highlight.invalidated.includes(i);
            const isModified    = highlight.modified.includes(i);
            const isShared      = highlight.shared.includes(i);
            const isSender      = highlight.sender === i;
            
            // Highlight connections that are part of the active bus transaction
            const isActiveConnection = busStage !== 'idle' && (isSender || isInvalidated || isModified || isShared);
            
            return (
               <path 
                 key={`path-${i}`}
                 d={`M ${coreCenter.x} ${coreCenter.y} L ${centers.bus!.x} ${centers.bus!.y}`}
                 fill="none"
                 stroke={isActiveConnection ? "hsl(217, 91%, 60%)" : "rgb(226,232,240)"}
                 strokeWidth={isActiveConnection ? 2 : 1.5}
                 strokeOpacity={isActiveConnection ? 0.7 : 0.8}
                 strokeLinecap="round"
                 className={`transition-colors duration-300 ${isActiveConnection && playState === 'playing' ? 'animate-pulse' : ''}`}
               />
            );
          })}
        </svg>

        {/* Bus label block */}
        <div
          ref={busRef}
          className={[
            'absolute rounded-md border-2 bg-white px-8 py-2 text-sm font-mono font-bold shadow-md z-10',
            'transition-all duration-300 flex items-center justify-center gap-2',
            busStage === 'bus'
              ? 'border-indigo-400 text-indigo-600 animate-pulse scale-105'
              : 'border-slate-200 text-slate-500',
          ].join(' ')}
          style={{ left: '50%', transform: 'translateX(-50%) translateY(-5.5rem)' }}
        >
          <div className="w-2 h-2 rounded-full bg-current opacity-70 animate-ping absolute -left-1"></div>
          {activeTxType ? txLabel(activeTxType) : 'System Bus'}
          <div className="w-2 h-2 rounded-full bg-current opacity-70 animate-ping absolute -right-1"></div>
        </div>

        {/* Core Chip Cards */}
        {Array.from({ length: coreCount }, (_, i) => {
          const newState      = newStateByCore.get(i) ?? null;
          const isInvalidated = highlight.invalidated.includes(i);
          const isModified    = highlight.modified.includes(i);
          const isShared      = highlight.shared.includes(i);
          const isSender      = highlight.sender === i;

          const circleStyle: CSSProperties = (() => {
            if (isInvalidated) return { borderColor: 'rgb(244,63,94)'  };
            if (isModified)    return { borderColor: 'rgb(239,68,68)'  };
            if (isShared) {
              if (newState === 'E') return { borderColor: 'rgb(16,185,129)' };
              if (newState === 'S') return { borderColor: 'rgb(59,130,246)' };
              /* O */               return { borderColor: 'rgb(245,158,11)' };
            }
            if (isSender) return { borderColor: 'rgb(16,185,129)' };
            return { borderColor: 'rgb(226,232,240)' };
          })();

          const isTarget = isInvalidated || isModified || isShared;
          const fxClass = (isInvalidated && playState === 'playing') ? 'animate-pulse scale-[1.02] ring-4 ring-rose-500/20' :
            (isSender && busStage !== 'idle' && playState === 'playing' ? 'scale-[1.02] ring-4 ring-emerald-500/20 shadow-lg z-20' :
            (isTarget && playState === 'playing' ? 'scale-[1.02] ring-4 ring-blue-500/10 z-20' : ''));

          const coreCache = caches.find(c => c.coreId === i);

          return (
            <div key={i} className="flex flex-col items-center gap-1.5 z-20 relative">
              <div
                ref={(el) => { coreRefs.current[i] = el; }}
                className={[
                  'w-36 rounded-xl border-2 flex flex-col items-stretch overflow-hidden',
                  'transition-all duration-300 shadow-sm bg-white',
                  fxClass,
                ].join(' ')}
                style={circleStyle}
              >
                {/* Chip Header */}
                <div className="bg-slate-50 px-3 py-2 border-b border-inherit flex justify-between items-center text-slate-700">
                  <span className="font-bold font-mono text-xs leading-none">CORE {i}</span>
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                </div>
                
                {/* Cache Slots Area */}
                <div className="p-2 flex flex-col gap-1.5 bg-white min-h-[64px]">
                  {coreCache && coreCache.lines.size > 0 ? (
                    Array.from(coreCache.lines.values()).map(line => {
                       const stateColor = line.state === 'M' ? 'bg-red-500' :
                                          line.state === 'E' ? 'bg-emerald-500' :
                                          line.state === 'S' ? 'bg-blue-500' :
                                          line.state === 'O' ? 'bg-amber-500' : 'bg-rose-400';
                       
                       const isChangedSlot = (isModified || isInvalidated || isShared) && busTransactions[0]?.address === line.address;

                       return (
                         <div key={line.address} className={`border ${isChangedSlot && playState === 'playing' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-slate-50'} rounded px-2 py-1 flex justify-between items-center transition-colors`}>
                             <span className="font-mono text-[10px] font-bold text-slate-600">{line.address}</span>
                             <span className={`w-4 h-4 rounded-[3px] flex items-center justify-center text-[9px] font-bold text-white shadow-sm transition-colors ${stateColor}`}>
                               {line.state}
                             </span>
                         </div>
                       )
                    })
                  ) : (
                    <div className="text-[10px] text-slate-400 flex items-center justify-center py-3 h-full italic">Empty Cache</div>
                  )}
                </div>
              </div>

              {/* Status pill under chip */}
               <span
                className={[
                  'text-[10px] font-mono font-bold transition-colors duration-300 px-2 py-0.5 rounded-full border',
                  newState
                    ? (STATE_COLORS[newState] ?? 'text-slate-500')
                    : 'text-transparent border-transparent',
                  newState ? 'border-current bg-white' : ''
                ].join(' ')}
                aria-hidden="true"
              >
                {newState ?? 'I'}
              </span>
            </div>
          );
        })}

        {/* Signal dot */}
        {dot.visible && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-50 text-indigo-500"
            style={{
              width: 16,
              height: 16,
              top: 0,
              left: 0,
              transform: `translate(${dot.x - 8}px, ${dot.y - 8}px)`,
              transition: `transform ${dotTransitionMs}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
            }}
          >
            <div className="w-full h-full rounded-full bg-current shadow-[0_0_12px_currentColor]"></div>
            <div className="absolute inset-0 rounded-full bg-current animate-ping opacity-75"></div>
          </div>
        )}
      </div>

      {/* ── Playback controls ───────────────────────────────────────────────── */}
      {hasTransactions && (
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">

          <button
            onClick={handlePlayPause}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold',
              'border transition-colors shadow-sm',
              playState === 'playing'
                ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            ].join(' ')}
            aria-label={`${playButtonLabel} animation`}
          >
            <PlayIcon />
            {playButtonLabel}
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mr-1">Speed</span>
            <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
              {SPEED_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSpeed(value)}
                  className={[
                    'px-2.5 py-1 text-[10px] font-mono transition-colors rounded-sm font-bold',
                    speed === value
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800',
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

    </div>
  );
}