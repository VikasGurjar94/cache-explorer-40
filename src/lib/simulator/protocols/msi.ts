import { CoreCache, CacheStateValue, BusTransaction, Operation, LogEntry } from '../types';
import { getCacheLine, setCacheLine, updateState } from '../cache';

export function executeMSI(
  operation: Operation,
  caches: CoreCache[],
  memory: Map<string, number>,
  step: number
): LogEntry {
  const { coreId, type, address, value } = operation;
  const cache = caches[coreId];
  const line = getCacheLine(cache, address);
  const busTransactions: BusTransaction[] = [];
  const stateChanges: LogEntry['stateChanges'] = [];
  const memoryUpdates: LogEntry['memoryUpdates'] = [];
  const description: string[] = [];
  let hitOrMiss: 'hit' | 'miss' = 'miss';

  if (!memory.has(address)) {
    memory.set(address, 0);
  }

  if (type === 'READ') {
    if (line && line.state !== 'I') {
      // Cache hit
      hitOrMiss = 'hit';
      description.push(`Core ${coreId} READ ${address}: Cache hit (${line.state})`);
    } else {
      // Cache miss — issue BusRd
      hitOrMiss = 'miss';
      busTransactions.push({ type: 'BusRd', initiator: coreId, address });
      description.push(`Core ${coreId} READ ${address}: Cache miss, BusRd issued`);

      // Check if any other cache has it in Modified
      let suppliedByCache = false;
      for (const other of caches) {
        if (other.coreId === coreId) continue;
        const otherLine = getCacheLine(other, address);
        if (otherLine && otherLine.state === 'M') {
          // Flush to memory first
          busTransactions.push({ type: 'WriteBack', initiator: other.coreId, address });
          const oldMem = memory.get(address)!;
          memory.set(address, otherLine.value);
          memoryUpdates.push({ address, oldValue: oldMem, newValue: otherLine.value });
          description.push(`Core ${other.coreId} flushes ${address} to memory`);

          stateChanges.push({ coreId: other.coreId, address, oldState: 'M', newState: 'S' });
          updateState(other, address, 'S');
          suppliedByCache = true;
        } else if (otherLine && otherLine.state === 'S') {
          // stays S
          suppliedByCache = true;
        }
      }

      const memVal = memory.get(address)!;
      const oldState = line?.state || null;
      setCacheLine(cache, address, memVal, 'S');
      stateChanges.push({ coreId, address, oldState, newState: 'S' });
      description.push(`Core ${coreId} loads ${address} = ${memVal}, state → Shared`);
    }
  } else {
    // WRITE
    const writeVal = value ?? 0;

    if (line && line.state === 'M') {
      // Hit in Modified — just update value
      hitOrMiss = 'hit';
      line.value = writeVal;
      description.push(`Core ${coreId} WRITE ${address} = ${writeVal}: Hit in Modified, value updated`);
    } else if (line && line.state === 'S') {
      // Need to upgrade — BusUpgr (or BusRdX in MSI)
      hitOrMiss = 'hit';
      busTransactions.push({ type: 'BusRdX', initiator: coreId, address });
      description.push(`Core ${coreId} WRITE ${address} = ${writeVal}: Hit in Shared, BusRdX issued`);

      // Invalidate others
      for (const other of caches) {
        if (other.coreId === coreId) continue;
        const otherLine = getCacheLine(other, address);
        if (otherLine && otherLine.state !== 'I') {
          stateChanges.push({ coreId: other.coreId, address, oldState: otherLine.state, newState: 'I' });
          updateState(other, address, 'I');
          description.push(`Core ${other.coreId} invalidated`);
        }
      }

      const oldState = line.state;
      line.value = writeVal;
      line.state = 'M';
      stateChanges.push({ coreId, address, oldState, newState: 'M' });
      description.push(`Core ${coreId} state → Modified`);
    } else {
      // Miss or Invalid
      hitOrMiss = 'miss';
      busTransactions.push({ type: 'BusRdX', initiator: coreId, address });
      description.push(`Core ${coreId} WRITE ${address} = ${writeVal}: Cache miss, BusRdX issued`);

      // Check other caches
      for (const other of caches) {
        if (other.coreId === coreId) continue;
        const otherLine = getCacheLine(other, address);
        if (otherLine && otherLine.state === 'M') {
          busTransactions.push({ type: 'WriteBack', initiator: other.coreId, address });
          const oldMem = memory.get(address)!;
          memory.set(address, otherLine.value);
          memoryUpdates.push({ address, oldValue: oldMem, newValue: otherLine.value });
          description.push(`Core ${other.coreId} flushes ${address} to memory`);
        }
        if (otherLine && otherLine.state !== 'I') {
          stateChanges.push({ coreId: other.coreId, address, oldState: otherLine.state, newState: 'I' });
          updateState(other, address, 'I');
          description.push(`Core ${other.coreId} invalidated`);
        }
      }

      const oldState = line?.state || null;
      setCacheLine(cache, address, writeVal, 'M');
      stateChanges.push({ coreId, address, oldState, newState: 'M' });
      description.push(`Core ${coreId} state → Modified`);
    }
  }

  return { step, operation, busTransactions, stateChanges, memoryUpdates, hitOrMiss, description };
}
