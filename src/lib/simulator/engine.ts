import { SimulatorState, Operation, ProtocolType, LogEntry, SimulatorSnapshot } from './types';
import { createCache, createMemory, cloneCaches, cloneMemory, getCacheLine, setCacheLine } from './cache';
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

export function createSimulatorState(
  protocol: ProtocolType,
  coreCount: number,
  ppcMode = false
): SimulatorState {
  const caches = Array.from({ length: coreCount }, (_, i) => createCache(i));
  const initialState: Omit<SimulatorState, 'timelineIndex' | 'history'> = {
    caches,
    memory: createMemory(),
    logs: [],
    operationQueue: [],
    stepCount: 0,
    protocol,
    coreCount,
    ppcMode,
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

// ─── PPC helpers ─────────────────────────────────────────────────────────────

/** Sequential address alphabet used in presets (A→B→C…Z) */
const ADDR_SEQUENCE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Returns the address that logically follows `addr` in the alphabet.
 * Only handles single capital-letter addresses (A-Z).
 */
function nextAddr(addr: string): string | null {
  const idx = ADDR_SEQUENCE.indexOf(addr.toUpperCase());
  if (idx === -1 || idx === ADDR_SEQUENCE.length - 1) return null;
  return ADDR_SEQUENCE[idx + 1];
}

/**
 * Detect a sequential read pattern from the *pending* queue for a given core.
 * Returns true if the upcoming 2+ operations from `coreId` are sequential reads.
 */
function isSequentialReadPattern(queue: Operation[], coreId: number, currentAddr: string): boolean {
  const coreOps = queue.filter((op) => op.coreId === coreId && op.type === 'READ');
  if (coreOps.length === 0) return false;
  const expected = nextAddr(currentAddr);
  return expected !== null && coreOps[0]?.address?.toUpperCase() === expected;
}

/**
 * Pre-load the next address into the requesting core's cache silently (PPC prefetch).
 * This simulates the hardware prefetcher loading the next cache line before it's needed.
 * The line is loaded in Shared (S) state from memory.
 * Returns true if a prefetch was actually performed.
 */
function doPrefetch(
  queue: Operation[],
  coreId: number,
  currentAddr: string,
  caches: SimulatorState['caches'],
  memory: Map<string, number>
): boolean {
  if (!isSequentialReadPattern(queue, coreId, currentAddr)) return false;

  const prefetchAddr = nextAddr(currentAddr);
  if (!prefetchAddr) return false;

  const cache = caches[coreId];
  const existing = getCacheLine(cache, prefetchAddr);
  // Don't prefetch if already valid in cache
  if (existing && existing.state !== 'I') return false;

  if (!memory.has(prefetchAddr)) memory.set(prefetchAddr, 0);
  const memVal = memory.get(prefetchAddr)!;
  setCacheLine(cache, prefetchAddr, memVal, 'S');
  return true;
}

// ─── Main execution ──────────────────────────────────────────────────────────

export function executeNextStep(state: SimulatorState): SimulatorState | null {
  if (state.operationQueue.length === 0) return null;

  const [nextOp, ...remaining] = state.operationQueue;
  const newCaches = cloneCaches(state.caches);
  const newMemory = cloneMemory(state.memory);
  const step = state.stepCount + 1;

  // ── PPC: check if this demand fetch was already prefetched ───────────────
  // Before running the protocol logic, see if PPC already loaded this line.
  let wasPrefetched = false;
  if (state.ppcMode && nextOp.type === 'READ') {
    const cacheBeforeExec = newCaches[nextOp.coreId];
    const existingLine = getCacheLine(cacheBeforeExec, nextOp.address);
    wasPrefetched = !!(existingLine && existingLine.state !== 'I');
  }

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

  // Mark the log entry if this was a PPC-prefetched hit
  if (wasPrefetched && log.hitOrMiss === 'hit') {
    log.isPrefetch = true;
    log.description.push(
      `[PPC] Address ${nextOp.address} was prefetched by hardware — served as L1 hit.`
    );
  }

  // ── PPC: after executing this op, prefetch the NEXT sequential address ───
  if (state.ppcMode && nextOp.type === 'READ') {
    const prefetched = doPrefetch(remaining, nextOp.coreId, nextOp.address, newCaches, newMemory);
    if (prefetched) {
      const prefetchAddr = nextAddr(nextOp.address)!;
      log.description.push(
        `[PPC] Hardware prefetcher loaded ${prefetchAddr} into Core ${nextOp.coreId}'s cache.`
      );
    }
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
