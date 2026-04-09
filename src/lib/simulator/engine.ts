import { SimulatorState, Operation, ProtocolType, LogEntry, SimulatorSnapshot } from './types';
import { createCache, createMemory, cloneCaches, cloneMemory } from './cache';
import { executeMSI } from './protocols/msi';
import { executeMESI } from './protocols/mesi';
import { executeMOESI } from './protocols/moesi';

function snapshotFromState(state: SimulatorState, operation: Operation | null = null): SimulatorSnapshot {
  return {
    step: state.stepCount,
    caches: cloneCaches(state.caches),
    memory: cloneMemory(state.memory),
    logs: [...state.logs],
    operation,
  };
}

export function createSimulatorState(protocol: ProtocolType, coreCount: number): SimulatorState {
  const caches = Array.from({ length: coreCount }, (_, i) => createCache(i));
  const initialState: Omit<SimulatorState, 'timelineIndex' | 'history'> = {
    caches,
    memory: createMemory(),
    logs: [],
    operationQueue: [],
    stepCount: 0,
    protocol,
    coreCount,
  };
  const fullState: SimulatorState = {
    ...initialState,
    timelineIndex: 0,
    history: [],
  };
  return { ...fullState, history: [snapshotFromState(fullState, null)] };
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

  // ── Hardware-accurate cache latency model ────────────────────────────────
  // Based on real CPU memory hierarchy timings (modern x86-64, ~3GHz clock):
  //   L1 hit          :   1 ns   (3–4 cycles)
  //   L2 miss / fetch :  10 ns   (~30 cycles, shared LLC or L2)
  //   DRAM fetch      : 100 ns   (~300 cycles, DDR4 CAS latency + controller)
  //   Bus arbitration :   5 ns   (snooping + grant)
  //   Bus data xfer   :  10 ns   (64B cache line over FSB/QPI/HyperTransport)
  //   Invalidation msg:   5 ns   (MESI/MOESI invalidate broadcast per core)
  //   WriteBack to mem:  80 ns   (dirty line flush, includes write-buffer drain)

  let calculatedTimeNs: number;

  if (log.hitOrMiss === 'hit') {
    // L1 cache hit — serviced entirely from the local cache
    calculatedTimeNs = 1;
  } else {
    // Check for cache-to-cache (S→S or M→S) transfer vs DRAM fetch
    const hasCacheToCacheTransfer = log.busTransactions.some(
      (t) => t.type === 'BusRd' || t.type === 'BusUpgr'
    );
    if (hasCacheToCacheTransfer) {
      // Supplied by another core's cache (e.g. S→S sharing, M→S intervention)
      // Cheaper than DRAM: bus arbitration + line transfer
      calculatedTimeNs = 10 + 5 + 10; // L2 miss + bus arb + bus xfer = 25 ns
    } else {
      // True cold miss — must go all the way to DRAM
      calculatedTimeNs = 100; // DRAM fetch
    }
  }

  // Bus transaction overhead (one round per transaction)
  for (const tx of log.busTransactions) {
    calculatedTimeNs += 5;  // arbitration per transaction
    calculatedTimeNs += 10; // data transfer per cache-line
    if (tx.type === 'BusRdX' || tx.type === 'BusUpgr') {
      // Invalidation broadcast: each snooping core adds ~5 ns acknowledgement
      const invalidatedCount = log.stateChanges.filter((sc) => sc.newState === 'I').length;
      calculatedTimeNs += invalidatedCount * 5;
    }
  }

  // WriteBack penalty — dirty line must be flushed to memory first
  calculatedTimeNs += log.memoryUpdates.length * 80;

  // Append timing to log entry
  log.accessTimeNs = calculatedTimeNs;

  const nextState: SimulatorState = {
    ...state,
    caches: newCaches,
    memory: newMemory,
    logs: [...state.logs, log],
    operationQueue: remaining,
    stepCount: step,
    history: [...state.history, snapshotFromState({
      ...state,
      caches: newCaches,
      memory: newMemory,
      logs: [...state.logs, log],
      stepCount: step,
    }, nextOp)],
    timelineIndex: state.history.length,
  };

  return nextState;
}

export function resetSimulator(protocol: ProtocolType, coreCount: number): SimulatorState {
  return createSimulatorState(protocol, coreCount);
}
