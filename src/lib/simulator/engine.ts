import { SimulatorState, Operation, ProtocolType, LogEntry } from './types';
import { createCache, createMemory, cloneCaches, cloneMemory } from './cache';
import { executeMSI } from './protocols/msi';
import { executeMESI } from './protocols/mesi';
import { executeMOESI } from './protocols/moesi';

export function createSimulatorState(protocol: ProtocolType, coreCount: number): SimulatorState {
  const caches = Array.from({ length: coreCount }, (_, i) => createCache(i));
  return {
    caches,
    memory: createMemory(),
    logs: [],
    operationQueue: [],
    stepCount: 0,
    protocol,
    coreCount,
  };
}

export function addOperation(state: SimulatorState, op: Operation): SimulatorState {
  return { ...state, operationQueue: [...state.operationQueue, op] };
}

export function executeNextStep(state: SimulatorState): SimulatorState | null {
  if (state.operationQueue.length === 0) return null;

  const [nextOp, ...remaining] = state.operationQueue;
  const newCaches = cloneCaches(state.caches);
  const newMemory = cloneMemory(state.memory);
  const step = state.stepCount + 1;

  let log: LogEntry;
  switch (state.protocol) {
    case 'MSI':
      log = executeMSI(nextOp, newCaches, newMemory, step);
      break;
    case 'MESI':
      log = executeMESI(nextOp, newCaches, newMemory, step);
      break;
    case 'MOESI':
      log = executeMOESI(nextOp, newCaches, newMemory, step);
      break;
  }

  return {
    ...state,
    caches: newCaches,
    memory: newMemory,
    logs: [...state.logs, log],
    operationQueue: remaining,
    stepCount: step,
  };
}

export function resetSimulator(protocol: ProtocolType, coreCount: number): SimulatorState {
  return createSimulatorState(protocol, coreCount);
}
