import { useCallback, useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { ProtocolType, Operation } from '@/lib/simulator/types';
import { createSimulatorState, addOperation, executeNextStep } from '@/lib/simulator/engine';
import { SimulatorControls } from '@/components/SimulatorControls';
import { OperationInput } from '@/components/OperationInput';
import { CacheTable } from '@/components/CacheTable';
import { MemoryView } from '@/components/MemoryView';
import { LogPanel } from '@/components/LogPanel';

import { TimelinePanel } from '@/components/TimelinePanel';
import { BusVisualizer } from '@/components/BusVisualizer';
import { SCENARIO_PRESETS } from '@/lib/simulator/presets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


const Index = () => {
  const [state, setState] = useState(() => createSimulatorState('MSI', 2));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (window.localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [learningMode, setLearningMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('learningMode') !== 'false';
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [presetMessage, setPresetMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'simulator' | 'timeline' | 'learn' | 'more'>('simulator');
  const [presetsOpen, setPresetsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('learningMode', learningMode ? 'true' : 'false');
  }, [learningMode]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleLearningMode = useCallback(() => {
    setLearningMode((prev) => !prev);
  }, []);

  const themeLabel = useMemo(() => (theme === 'light' ? 'Switch to dark' : 'Switch to light'), [theme]);

  const handleProtocolChange = useCallback((p: ProtocolType) => {
    setState(createSimulatorState(p, state.coreCount));
  }, [state.coreCount]);

  const handleCoreCountChange = useCallback((n: number) => {
    setState(createSimulatorState(state.protocol, n));
  }, [state.protocol]);

  const handleReset = useCallback(() => {
    setState(createSimulatorState(state.protocol, state.coreCount));
  }, [state.protocol, state.coreCount]);

  const handleAddOperation = useCallback((op: Operation) => {
    setState((s) => addOperation(s, op));
  }, []);

  const handleRemoveOperation = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      operationQueue: s.operationQueue.filter((_, i) => i !== index),
    }));
  }, []);

  const handleNextStep = useCallback(() => {
    setState((s) => executeNextStep(s) ?? s);
  }, []);

  const handleRunAll = useCallback(() => {
    setState((s) => {
      let current = s;
      while (current.operationQueue.length > 0) {
        const next = executeNextStep(current);
        if (!next) break;
        current = next;
      }
      return current;
    });
  }, []);

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      if (preset.supportedProtocols && !preset.supportedProtocols.includes(state.protocol)) {
        setPresetMessage(`Preset "${preset.title}" is not fully supported on ${state.protocol}.`);
        return;
      }

      setActivePreset(presetId);
      setPresetMessage(`Loaded preset: ${preset.title}`);
      setState((s) => {
        const next = createSimulatorState(s.protocol, s.coreCount);
        return {
          ...next,
          operationQueue: [...preset.operations],
        };
      });
      toast.success(`Preset loaded: ${preset.title}`);
    },
    [state.protocol]
  );

  const handleStepBackward = useCallback(() => {
    const target = Math.max(0, state.timelineIndex - 1);
    if (target === state.timelineIndex) return;
    setState((s) => ({
      ...s,
      timelineIndex: target,
    }));
    toast.message(`Simulator upgraded for step ${target}`);
  }, [state.timelineIndex]);

  const handleStepForward = useCallback(() => {
    const atEnd = state.timelineIndex >= state.history.length - 1;
    const canAdvance = !atEnd || state.operationQueue.length > 0;
    if (!canAdvance) {
      toast.info('No more steps to simulate.');
      return;
    }

    const target = atEnd ? state.history.length : state.timelineIndex + 1;

    setState((s) => {
      if (s.timelineIndex < s.history.length - 1) {
        return { ...s, timelineIndex: s.timelineIndex + 1 };
      }
      const next = executeNextStep(s);
      return next ?? s;
    });
    toast.message(`Simulator upgraded for step ${target}`);
  }, [state.history.length, state.operationQueue.length, state.timelineIndex]);

  const handleJumpTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, state.history.length - 1));
      if (clamped === state.timelineIndex) return;
      setState((s) => ({
        ...s,
        timelineIndex: clamped,
      }));
      toast.message(`Simulator upgraded for step ${clamped}`);
    },
    [state.history.length, state.timelineIndex]
  );

  const handleSelectTimelineItem = useCallback(
    (index: number) => {
      if (index === state.timelineIndex) return;
      setState((s) => ({ ...s, timelineIndex: index }));
      toast.message(`Simulator upgraded for step ${index}`);
    },
    [state.timelineIndex]
  );

  const displaySnapshot = state.history[state.timelineIndex] ?? state.history[0];
  const displayCaches = displaySnapshot?.caches ?? state.caches;
  const displayMemory = displaySnapshot?.memory ?? state.memory;
  const displayLogs = displaySnapshot?.logs ?? state.logs;
  const displayLastLog = displayLogs[displayLogs.length - 1];
  const busTransactions = displayLastLog?.busTransactions ?? [];
  const busStateChanges = displayLastLog?.stateChanges ?? [];
  const activeCoreId = displaySnapshot?.operation?.coreId ?? null;



  const metrics = useMemo(() => {
    const total = displayLogs.length;
    let hits = 0;
    let misses = 0;
    let busEvents = 0;
    let memoryWrites = 0;
    for (const log of displayLogs) {
      if (log.hitOrMiss === 'hit') hits++;
      else misses++;
      busEvents += log.busTransactions.length;
      memoryWrites += log.memoryUpdates.length;
    }
    return { total, hits, misses, busEvents, memoryWrites };
  }, [displayLogs]);

  const invalidatedCores = Array.from(
    new Set(busStateChanges.filter((c) => c.newState === 'I').map((c) => c.coreId))
  ).sort((a, b) => a - b);

  const sharingDetails = (() => {
    const map = new Map<number, 'S' | 'E' | 'O'>();
    for (const ch of busStateChanges) {
      if (ch.newState === 'S' || ch.newState === 'E' || ch.newState === 'O') {
        map.set(ch.coreId, ch.newState);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([coreId, st]) => `C${coreId}→${st}`);
  })();
  const latestOp = displaySnapshot?.operation;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="relative max-w-[1400px] mx-auto space-y-6">
        <header className="rounded-2xl border border-border bg-card/90 p-4 shadow-lg backdrop-blur-sm dark:bg-slate-900/80 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Cache Coherency Simulator</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">Visualize MSI, MESI & MOESI transitions with step-by-step operations.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-secondary-foreground">
                  {state.protocol} • {state.coreCount} cores
                </div>
                <Button
                  size="sm"
                  variant={learningMode ? 'secondary' : 'outline'}
                  onClick={toggleLearningMode}
                  className={`font-mono gap-2 ${
                    learningMode
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${learningMode ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
                  />
                  Learning Mode: {learningMode ? 'ON' : 'OFF'}
                </Button>
                {latestOp && (
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="outline" className="font-mono text-xs bg-muted/40 px-2 py-1">
                      Active: C{latestOp.coreId} {latestOp.type} {latestOp.address}
                      {latestOp.type === 'WRITE' ? `=${latestOp.value ?? 0}` : ''}
                    </Badge>
                    {displayLastLog?.accessTimeNs !== undefined && (
                      <Badge variant="secondary" className="font-mono text-xs shadow-sm bg-background border px-2 py-1">
                        ⏱️ {displayLastLog.accessTimeNs}ns
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="rounded-2xl border border-border bg-background p-3 dark:bg-slate-800">
                <SimulatorControls
                  protocol={state.protocol}
                  coreCount={state.coreCount}
                  onProtocolChange={handleProtocolChange}
                  onCoreCountChange={handleCoreCountChange}
                  onReset={handleReset}
                />
              </div>

              <button
                type="button"
                aria-label={themeLabel}
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 dark:text-slate-100"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 bg-muted/40 p-1 rounded-md border border-border">
            {[
              { value: 'simulator', label: 'Simulator' },
              { value: 'timeline', label: 'Timeline' },
              { value: 'learn', label: 'Learn' },
              { value: 'more', label: 'More' },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setActiveTab(t.value as typeof activeTab)}
                className={`px-3 py-1.5 rounded-md border text-sm font-mono transition ${
                  activeTab === t.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <OperationInput
                  coreCount={state.coreCount}
                  operationQueue={state.operationQueue}
                  onAddOperation={handleAddOperation}
                  onRemoveOperation={handleRemoveOperation}
                  onNextStep={handleNextStep}
                  onRunAll={handleRunAll}
                  hasOperations={state.operationQueue.length > 0}
                />
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3 space-y-6">
                  <BusVisualizer
                    key={`bus-${displaySnapshot?.step ?? 0}`}
                    coreCount={state.coreCount}
                    busTransactions={busTransactions}
                    stateChanges={busStateChanges}
                    activeStep={displaySnapshot?.step ?? 0}
                  />

                  <div
                    className={`grid gap-3 ${
                      state.coreCount <= 2
                        ? 'grid-cols-1 sm:grid-cols-2'
                        : state.coreCount === 3
                          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    }`}
                  >
                    {displayCaches.map((cache) => (
                      <CacheTable key={cache.coreId} cache={cache} activeCoreId={activeCoreId} />
                    ))}
                  </div>

                  <MemoryView memory={displayMemory} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-xl border border-border bg-background p-5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/50"></div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Bus Activity</div>
                        <div className="mt-1 text-base font-semibold">Step {displaySnapshot?.step ?? 0} Events</div>
                      </div>
                      {displayLastLog?.accessTimeNs !== undefined ? (
                         <div className="text-right">
                           <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-bold">Time taken</div>
                           <Badge variant="secondary" className="font-mono text-sm shadow-sm bg-background border">
                             ⏱️ {displayLastLog.accessTimeNs}ns
                           </Badge>
                         </div>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-xs">
                          Step {displaySnapshot?.step ?? 0}
                        </Badge>
                      )}
                    </div>

                    {busTransactions.length === 0 ? (
                      <p className="mt-3 text-xs text-muted-foreground">No bus requests needed for this step.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          {busTransactions.slice(-2).map((tx, idx) => (
                            <Badge key={`${tx.type}-${tx.initiator}-${idx}`} variant="outline" className="font-mono text-xs">
                              C{tx.initiator} → {tx.type}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {invalidatedCores.length > 0 && (
                            <div className="text-rose-600">
                              Invalidations: {invalidatedCores.map((c) => `C${c}`).join(', ')}
                            </div>
                          )}
                          {sharingDetails.length > 0 && (
                            <div>
                              Sharing: {sharingDetails.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>


                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <TimelinePanel
                history={state.history}
                selectedIndex={state.timelineIndex}
                protocol={state.protocol}
                onSelect={handleSelectTimelineItem}
                onReset={() => setState(createSimulatorState(state.protocol, state.coreCount))}
                onStepBackward={handleStepBackward}
                onStepForward={handleStepForward}
                onJumpTo={handleJumpTo}
              />
            </div>
          )}

          {activeTab === 'learn' && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="h-[560px]">
                <LogPanel logs={displayLogs} learningMode={learningMode} protocol={state.protocol} />
              </div>
            </div>
          )}

          {activeTab === 'more' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scenario Presets</div>
                <div className="mt-1 text-sm font-semibold">Open a teaching sequence</div>

                <div className="mt-3">
                  <Sheet open={presetsOpen} onOpenChange={setPresetsOpen}>
                    <SheetTrigger asChild>
                      <Button size="sm" variant="outline" className="font-mono">Choose Preset</Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-lg">
                      <SheetHeader>
                        <SheetTitle>Scenario Presets</SheetTitle>
                      </SheetHeader>

                      <div className="mt-4 space-y-3">
                        <div className="text-xs text-muted-foreground font-mono">
                          Selected: {activePreset || 'None'}
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {SCENARIO_PRESETS.map((preset) => {
                            const enabled = !preset.supportedProtocols || preset.supportedProtocols.includes(state.protocol);
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => {
                                  handleLoadPreset(preset.id);
                                  setPresetsOpen(false);
                                }}
                                disabled={!enabled}
                                className={`rounded-lg border p-2 text-left text-xs font-mono ${
                                  enabled
                                    ? 'border-border bg-background hover:border-primary'
                                    : 'border-slate-300 bg-slate-100 text-muted-foreground cursor-not-allowed'
                                }`}
                              >
                                <div className="font-semibold text-xs">{preset.title}</div>
                                <div className="text-[11px] text-muted-foreground mt-1">{preset.description}</div>
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                  Ops:{' '}
                                  {preset.operations
                                    .map((o) => `${o.type}${o.value !== undefined ? `(${o.value})` : ''} ${o.address} C${o.coreId}`)
                                    .join(' → ')}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {presetMessage && <div className="text-[11px] font-mono text-green-600">{presetMessage}</div>}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Metrics</div>
                    <div className="mt-1 text-sm font-semibold">Summary for the selected timeline frame</div>
                  </div>
                </div>

                <div className="mt-3">
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button size="sm" variant="outline" className="font-mono">
                        {metrics.total > 0 ? 'Show metrics' : 'No metrics yet'}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 space-y-2 text-xs font-mono text-muted-foreground">
                        <div>Total steps: {metrics.total}</div>
                        <div>Hits: {metrics.hits} • Misses: {metrics.misses}</div>
                        <div>Bus events: {metrics.busEvents}</div>
                        <div>Memory writes: {metrics.memoryWrites}</div>
                        <div>
                          Hit rate:{' '}
                          {metrics.total > 0 ? `${Math.round((metrics.hits / metrics.total) * 100)}%` : '—'}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
