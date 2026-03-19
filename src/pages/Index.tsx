import { useCallback, useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ProtocolType, Operation, BusTransactionType } from '@/lib/simulator/types';
import { createSimulatorState, addOperation, executeNextStep } from '@/lib/simulator/engine';
import { SimulatorControls } from '@/components/SimulatorControls';
import { OperationInput } from '@/components/OperationInput';
import { CacheTable } from '@/components/CacheTable';
import { MemoryView } from '@/components/MemoryView';
import { LogPanel } from '@/components/LogPanel';
import { TimelinePanel } from '@/components/TimelinePanel';
import { BusVisualizer } from '@/components/BusVisualizer';
import { SCENARIO_PRESETS } from '@/lib/simulator/presets';

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
  const [activeBusSignal, setActiveBusSignal] = useState<{
    initiator: number;
    type: BusTransactionType;
    recipients: number[];
    invalidations: number[];
  } | null>(null);

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

  const handleLoadPreset = useCallback((presetId: string) => {
    setState((s) => {
      const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
      if (!preset) return s;
      if (preset.supportedProtocols && !preset.supportedProtocols.includes(s.protocol)) {
        setPresetMessage(`Preset "${preset.title}" is not fully supported on ${s.protocol}.`);
        return s;
      }
      setActivePreset(presetId);
      setPresetMessage(`Loaded preset: ${preset.title}`);
      const next = createSimulatorState(s.protocol, s.coreCount);
      return {
        ...next,
        operationQueue: [...preset.operations],
      };
    });
  }, []);

  const handleStepBackward = useCallback(() => {
    setState((s) => ({
      ...s,
      timelineIndex: Math.max(0, s.timelineIndex - 1),
    }));
  }, []);

  const handleStepForward = useCallback(() => {
    setState((s) => {
      if (s.timelineIndex < s.history.length - 1) {
        return { ...s, timelineIndex: s.timelineIndex + 1 };
      }
      const next = executeNextStep(s);
      return next ?? s;
    });
  }, []);

  const handleJumpTo = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      timelineIndex: Math.max(0, Math.min(index, s.history.length - 1)),
    }));
  }, []);

  const handleSelectTimelineItem = useCallback((index: number) => {
    setState((s) => ({ ...s, timelineIndex: index }));
  }, []);

  useEffect(() => {
    const lastLog = state.logs[state.logs.length - 1];
    if (!lastLog) return;
    const busTx = lastLog.busTransactions[lastLog.busTransactions.length - 1];
    if (!busTx) {
      setActiveBusSignal(null);
      return;
    }
    const invalidations = lastLog.stateChanges
      .filter((c) => c.coreId !== lastLog.operation.coreId && c.newState === 'I')
      .map((c) => c.coreId);
    const recipients = Array.from(new Set(lastLog.stateChanges.map((c) => c.coreId).filter((id) => id !== lastLog.operation.coreId)));
    setActiveBusSignal({
      initiator: lastLog.operation.coreId,
      type: busTx.type,
      recipients,
      invalidations,
    });
  }, [state.logs]);

  const displaySnapshot = state.history[state.timelineIndex] ?? state.history[0];
  const displayCaches = displaySnapshot?.caches ?? state.caches;
  const displayMemory = displaySnapshot?.memory ?? state.memory;
  const displayLogs = displaySnapshot?.logs ?? state.logs;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="relative max-w-[1400px] mx-auto space-y-4">
        <button
          type="button"
          aria-label={themeLabel}
          onClick={toggleTheme}
          className="fixed right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 dark:text-slate-100"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-lg backdrop-blur-sm dark:bg-slate-900/80 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Cache Coherency Simulator
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Visualize MSI, MESI & MOESI transitions with step-by-step operations.
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <div className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-secondary-foreground">
                {state.protocol} • {state.coreCount} cores
              </div>
              <button
                type="button"
                onClick={toggleLearningMode}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${learningMode ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-muted bg-background text-muted-foreground'}`}
              >
                Learning Mode: {learningMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-3 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Operations queued</div>
              <div className="mt-1 text-xl font-semibold text-foreground">{state.operationQueue.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Caches</div>
              <div className="mt-1 text-xl font-semibold text-foreground">{state.caches.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Protocol</div>
              <div className="mt-1 text-xl font-semibold text-foreground">{state.protocol}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <SimulatorControls
            protocol={state.protocol}
            coreCount={state.coreCount}
            onProtocolChange={handleProtocolChange}
            onCoreCountChange={handleCoreCountChange}
            onReset={handleReset}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <OperationInput
            coreCount={state.coreCount}
            operationQueue={state.operationQueue}
            onAddOperation={handleAddOperation}
            onRemoveOperation={handleRemoveOperation}
            onNextStep={handleNextStep}
            onRunAll={handleRunAll}
            hasOperations={state.operationQueue.length > 0}
          />

          <div className="mt-4 border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scenario Presets</div>
                <p className="text-[11px] text-muted-foreground">Load teaching scenarios quickly.</p>
              </div>
              <div className="text-xs font-mono text-primary">Selected: {activePreset || 'None'}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SCENARIO_PRESETS.map((preset) => {
                const enabled = !preset.supportedProtocols || preset.supportedProtocols.includes(state.protocol);
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset.id)}
                    disabled={!enabled}
                    className={`rounded-lg border p-2 text-left text-xs font-mono ${enabled ? 'border-border bg-background hover:border-primary' : 'border-slate-300 bg-slate-100 text-muted-foreground cursor-not-allowed'}`}
                  >
                    <div className="font-semibold text-xs">{preset.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{preset.description}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">Ops: {preset.operations.map((o) => `${o.type}${o.value !== undefined ? `(${o.value})` : ''} ${o.address} C${o.coreId}`).join(' → ')}</div>
                  </button>
                );
              })}
            </div>
            {presetMessage && <div className="mt-2 text-[11px] font-mono text-green-600">{presetMessage}</div>}
          </div>
        </div>

        {/* <div className="rounded-2xl border border-border bg-card p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <BusVisualizer coreCount={state.coreCount} activeSignal={activeBusSignal} />
        </div> */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <div className={`grid gap-3 ${state.coreCount <= 2 ? 'grid-cols-1 sm:grid-cols-2' : state.coreCount === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
              {displayCaches.map((cache) => (
                <CacheTable key={cache.coreId} cache={cache} />
              ))}
            </div>
            <MemoryView memory={displayMemory} />
          </div>
          <div className="lg:col-span-2 space-y-3">
            <div className="h-[320px]">
              <LogPanel logs={displayLogs} learningMode={learningMode} protocol={state.protocol} />
            </div>
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
        </div>
      </div>
    </div>
  );
};

export default Index;
