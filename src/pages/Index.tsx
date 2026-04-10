import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Cpu, Activity, LayoutGrid, Zap, Database, BookOpen, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProtocolType, Operation } from '@/lib/simulator/types';
import { createSimulatorState, addOperation, executeNextStep } from '@/lib/simulator/engine';
import { SimulatorControls } from '@/components/SimulatorControls';
import { OperationInput } from '@/components/OperationInput';
import { MemoryView } from '@/components/MemoryView';
import { LogPanel } from '@/components/LogPanel';
import { BusVisualizer } from '@/components/BusVisualizer';
import { SCENARIO_PRESETS } from '@/lib/simulator/presets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Index = () => {
  const [state, setState] = useState(() => createSimulatorState('MSI', 2, false));
  
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [presetMessage, setPresetMessage] = useState<string>('');
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [showCoachMark, setShowCoachMark] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowCoachMark(false), 12000);
    return () => clearTimeout(timer);
  }, []);

  const ppcMode = state.ppcMode;

  const handlePpcToggle = useCallback((enabled: boolean) => {
    setState((s) => createSimulatorState(s.protocol, s.coreCount, enabled));
  }, []);

  const handleProtocolChange = useCallback((p: ProtocolType) => {
    setState((s) => createSimulatorState(p, s.coreCount, s.ppcMode));
  }, []);

  const handleCoreCountChange = useCallback((n: number) => {
    setState((s) => createSimulatorState(s.protocol, n, s.ppcMode));
  }, []);

  const handleReset = useCallback(() => {
    setState((s) => createSimulatorState(s.protocol, s.coreCount, s.ppcMode));
  }, []);

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
        const next = createSimulatorState(s.protocol, s.coreCount, s.ppcMode);
        return {
          ...next,
          operationQueue: [...preset.operations],
        };
      });
      toast.success(`Preset loaded: ${preset.title}`);
    },
    [state.protocol]
  );

  const displaySnapshot = state.history[state.timelineIndex] ?? state.history[0];
  const displayCaches = displaySnapshot?.caches ?? state.caches;
  const displayMemory = displaySnapshot?.memory ?? state.memory;
  const displayLogs = displaySnapshot?.logs ?? state.logs;
  const displayLastLog = displayLogs[displayLogs.length - 1];
  const busTransactions = displayLastLog?.busTransactions ?? [];
  const busStateChanges = displayLastLog?.stateChanges ?? [];

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

  const latestOp = displaySnapshot?.operation;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-800">
      
      {/* ── LEFT SIDEBAR (Controls) ── */}
      <aside className="w-[280px] flex-shrink-0 flex flex-col border-r border-border bg-card shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Cpu className="w-5 h-5" />
              <span className="font-bold tracking-tight text-slate-900 text-lg">Cache Explorer</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Coherence Simulator
            </div>
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
          <SimulatorControls
            protocol={state.protocol}
            coreCount={state.coreCount}
            onProtocolChange={handleProtocolChange}
            onCoreCountChange={handleCoreCountChange}
            onReset={handleReset}
          />

          <div className="border-t border-border pt-6">
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

          <div className="border-t border-border pt-6">
            {/* New PPC Feature Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-900 block flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      PPC Mode
                    </label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors shadow-sm">
                          Learn More
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Predictive Prefetch (PPC)
                          </DialogTitle>
                          <DialogDescription className="text-slate-600 block pt-4 space-y-4 text-sm">
                            <span className="block border-l-2 border-indigo-200 pl-3">
                              <strong>Concept:</strong> Predictive Prefetch Coherence is an advanced architectural technique where the cache controller <em>anticipates</em> which memory blocks a processor will request next, fetching them before they are explicitly requested.
                            </span>
                            <span className="block">
                              <strong>How it works:</strong> By detecting patterns (such as sequential memory reads in an array), the hardware streams upcoming data into the cache. When the core actually needs the data, it hits in the cache instead of paying the latency of a main memory access.
                            </span>
                            <span className="block bg-slate-50 p-3 rounded border border-slate-100 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-500 w-2/3">
                                See a sequential read scenario where PPC would be highly effective.
                              </span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  handleLoadPreset('ppc-pattern');
                                }}
                              >
                                Load Example
                              </Button>
                            </span>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <span className="text-[10px] text-slate-500">Predictive Prefetch Coherence</span>
                </div>
                <Switch checked={ppcMode} onCheckedChange={handlePpcToggle} />
              </div>

              {ppcMode && (() => {
                const prefetchedCount = displayLogs.filter(l => l.isPrefetch).length;
                const totalReads = displayLogs.filter(l => l.operation.type === 'READ').length;
                const savedNs = prefetchedCount * 99; // each prefetch saves ~99ns (100ns DRAM - 1ns L1)
                return (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-indigo-800 flex justify-between">
                      <span>Prefetch Activity</span>
                      <span className="text-emerald-600">Active</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500">Prefetch Hits</span>
                        <span className="font-bold text-emerald-600">{prefetchedCount}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500">Total Reads</span>
                        <span className="font-bold text-slate-700">{totalReads}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500">Latency Saved</span>
                        <span className="font-bold text-indigo-600">{savedNs}ns</span>
                      </div>
                    </div>
                    {totalReads > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((prefetchedCount / totalReads) * 100)}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-1 text-right">
                          {Math.round((prefetchedCount / totalReads) * 100)}% reads prefetched
                        </div>
                      </div>
                    )}
                    {prefetchedCount === 0 && totalReads === 0 && (
                      <p className="text-[10px] text-slate-400 italic">Run operations to see prefetch activity.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="border-t border-border pt-6 pb-4">
             <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 font-semibold">Presets</div>
             <Sheet open={presetsOpen} onOpenChange={setPresetsOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full font-mono text-xs">Load Scenario</Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Teaching Scenarios</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-3">
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
                            className={`rounded-lg border p-3 text-left transition-colors ${
                              enabled
                                ? 'border-border bg-card hover:border-primary hover:bg-slate-50 shadow-sm'
                                : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <div className="font-semibold text-sm">{preset.title}</div>
                            <div className="text-xs text-slate-500 mt-1">{preset.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
          </div>
        </div>
      </aside>

      {/* ── CENTER PANEL (Hero Visualization) ── */}
      <main className="flex-1 flex flex-col relative bg-slate-50/50 overflow-hidden">
        {/* Header bar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">System Architecture</span>
            
            <div className="h-4 w-px bg-slate-200 mx-2"></div>
            
            <div className="relative flex items-center gap-2">
              <div className="relative">
                <Link to="/guide" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-100">
                  <HelpCircle className="w-3.5 h-3.5" />
                  How to Use
                </Link>
                {showCoachMark && (
                  <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none animate-bounce whitespace-nowrap z-50">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 rounded-sm"></div>
                    ✨ Tool Guide
                  </div>
                )}
              </div>
              
              <div className="relative">
                <Link to="/learn" className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-3 py-1.5 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-transparent">
                  <BookOpen className="w-3.5 h-3.5" />
                  Learn Concepts
                </Link>

                {showCoachMark && (
                  <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none animate-bounce whitespace-nowrap z-50 animation-delay-150">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-600 rotate-45 rounded-sm"></div>
                    🎓 Core Theory
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {latestOp && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Active Operation:</span>
                  <Badge variant="secondary" className="font-mono text-xs bg-indigo-50 text-indigo-700 border-indigo-200 px-2.5 py-0.5">
                    C{latestOp.coreId} {latestOp.type} {latestOp.address}
                    {latestOp.type === 'WRITE' ? `=${latestOp.value ?? 0}` : ''}
                  </Badge>
                </div>
              )}
             <Badge variant="outline" className="font-mono text-xs shadow-sm bg-card border px-2.5 py-0.5 ml-2 text-slate-600">
               Step {displaySnapshot?.step ?? 0}
             </Badge>
          </div>
        </header>

        {/* The visualizer canvas */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative p-8">
           <div className="max-w-[1200px] mx-auto space-y-12">
              <BusVisualizer 
                coreCount={state.coreCount}
                busTransactions={busTransactions}
                stateChanges={busStateChanges}
                activeStep={displaySnapshot?.step ?? 0}
                caches={displayCaches}
              />
              
              <div className="pt-8 border-t border-border/50">
                <div className="flex items-center gap-2 mb-6">
                  <Database className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-sm text-slate-700">Main Memory Hierarchy</h3>
                </div>
                <MemoryView memory={displayMemory} />
              </div>
           </div>
        </div>
      </main>

      {/* ── RIGHT PANEL (Metrics & Trace) ── */}
      <aside className="w-[320px] flex-shrink-0 flex flex-col border-l border-border bg-card shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20">
         <div className="p-5 border-b border-border bg-slate-50/50">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h2 className="font-semibold text-sm text-slate-800">Real-Time Metrics</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-2">
               <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
                 <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Hit Rate</div>
                 <div className="text-xl font-mono font-bold text-slate-800">
                    {metrics.total > 0 ? `${Math.round((metrics.hits / metrics.total) * 100)}%` : '0%'}
                 </div>
               </div>
               <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
                 <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Bus Events</div>
                 <div className="text-xl font-mono font-bold text-slate-800">{metrics.busEvents}</div>
               </div>
            </div>
            
            <div className="flex justify-between items-center text-xs font-mono text-slate-500 px-1 mt-3">
              <span>Hits: <span className="text-emerald-600 font-bold">{metrics.hits}</span></span>
              <span>Misses: <span className="text-rose-600 font-bold">{metrics.misses}</span></span>
              <span>Writes: <span className="text-amber-600 font-bold">{metrics.memoryWrites}</span></span>
            </div>
         </div>

         <div className="flex-1 flex flex-col min-h-0">
           <div className="px-5 py-3 border-b border-border flex justify-between items-center bg-card">
             <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Operation Trace</div>
             {displayLastLog?.accessTimeNs !== undefined && (
                <span className="font-mono text-[10px] text-slate-400">⏱️ {displayLastLog.accessTimeNs}ns</span>
             )}
           </div>
           <div className="flex-1 overflow-hidden p-2 bg-slate-50/30">
               {/* LogPanel internally scrolls */}
               <LogPanel logs={displayLogs} protocol={state.protocol} />
           </div>
         </div>
      </aside>

    </div>
  );
};

export default Index;

