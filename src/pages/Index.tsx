import { useState, useCallback } from 'react';
import { ProtocolType, Operation } from '@/lib/simulator/types';
import { createSimulatorState, addOperation, executeNextStep } from '@/lib/simulator/engine';
import { SimulatorControls } from '@/components/SimulatorControls';
import { OperationInput } from '@/components/OperationInput';
import { CacheTable } from '@/components/CacheTable';
import { MemoryView } from '@/components/MemoryView';
import { LogPanel } from '@/components/LogPanel';

const Index = () => {
  const [state, setState] = useState(() => createSimulatorState('MSI', 2));

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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-4">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-mono font-bold tracking-tight text-foreground">
            Cache Coherency Simulator
          </h1>
          <p className="text-xs font-mono text-muted-foreground">
            Visualize MSI, MESI & MOESI protocol state transitions in multi-core systems
          </p>
        </div>

        {/* Controls */}
        <div className="rounded-md border bg-card p-3">
          <SimulatorControls
            protocol={state.protocol}
            coreCount={state.coreCount}
            onProtocolChange={handleProtocolChange}
            onCoreCountChange={handleCoreCountChange}
            onReset={handleReset}
          />
        </div>

        {/* Operation Input */}
        <div className="rounded-md border bg-card p-3">
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

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Caches + Memory */}
          <div className="lg:col-span-3 space-y-4">
            <div className={`grid gap-4 ${state.coreCount <= 2 ? 'grid-cols-2' : state.coreCount === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
              {state.caches.map((cache) => (
                <CacheTable key={cache.coreId} cache={cache} />
              ))}
            </div>
            <MemoryView memory={state.memory} />
          </div>

          {/* Right: Logs */}
          <div className="lg:col-span-2 min-h-[400px]">
            <LogPanel logs={state.logs} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
