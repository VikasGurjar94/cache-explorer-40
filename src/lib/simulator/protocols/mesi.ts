import { CoreCache, BusTransaction, Operation, LogEntry } from '../types';
import { getCacheLine, setCacheLine, updateState } from '../cache';

export function executeMESI(
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

  if (!memory.has(address)) memory.set(address, 0);

  if (type === 'READ') {
    if (line && line.state !== 'I') {
      hitOrMiss = 'hit';
      description.push(`Core ${coreId} READ ${address}: Cache hit (${line.state})`);
    } else {
      hitOrMiss = 'miss';
      busTransactions.push({ type: 'BusRd', initiator: coreId, address });
      description.push(`Core ${coreId} READ ${address}: Cache miss, BusRd issued`);

      let anySharer = false;
      for (const other of caches) {
        if (other.coreId === coreId) continue;
        const otherLine = getCacheLine(other, address);
        if (otherLine && otherLine.state === 'M') {
          busTransactions.push({ type: 'WriteBack', initiator: other.coreId, address });
          const oldMem = memory.get(address)!;
          memory.set(address, otherLine.value);
          memoryUpdates.push({ address, oldValue: oldMem, newValue: otherLine.value });
          stateChanges.push({ coreId: other.coreId, address, oldState: 'M', newState: 'S' });
          updateState(other, address, 'S');
          description.push(`Core ${other.coreId} flushes, transitions M → S`);
          anySharer = true;
        } else if (otherLine && otherLine.state === 'E') {
          stateChanges.push({ coreId: other.coreId, address, oldState: 'E', newState: 'S' });
          updateState(other, address, 'S');
          description.push(`Core ${other.coreId} transitions E → S`);
          anySharer = true;
        } else if (otherLine && otherLine.state === 'S') {
          anySharer = true;
        }
      }

      const memVal = memory.get(address)!;
      const newState = anySharer ? 'S' as const : 'E' as const;
      const oldState = line?.state || null;
      setCacheLine(cache, address, memVal, newState);
      stateChanges.push({ coreId, address, oldState, newState });
      description.push(`Core ${coreId} loads ${address} = ${memVal}, state → ${newState === 'E' ? 'Exclusive' : 'Shared'}`);
    }
  } else {
    const writeVal = value ?? 0;

    if (line && (line.state === 'M' || line.state === 'E')) {
      hitOrMiss = 'hit';
      const oldState = line.state;
      line.value = writeVal;
      if (line.state !== 'M') {
        line.state = 'M';
        stateChanges.push({ coreId, address, oldState, newState: 'M' });
      }
      description.push(`Core ${coreId} WRITE ${address} = ${writeVal}: Hit in ${oldState}, state → Modified`);
    } else if (line && line.state === 'S') {
      hitOrMiss = 'hit';
      busTransactions.push({ type: 'BusUpgr', initiator: coreId, address });
      description.push(`Core ${coreId} WRITE ${address} = ${writeVal}: Hit in Shared, BusUpgr issued`);

      for (const other of caches) {
        if (other.coreId === coreId) continue;
        const otherLine = getCacheLine(other, address);
        if (otherLine && otherLine.state !== 'I') {
          stateChanges.push({ coreId: other.coreId, address, oldState: otherLine.state, newState: 'I' });
          updateState(other, address, 'I');
          description.push(`Core ${other.coreId} invalidated`);
        }
      }

      line.value = writeVal;
      line.state = 'M';
      stateChanges.push({ coreId, address, oldState: 'S', newState: 'M' });
      description.push(`Core ${coreId} state → Modified`);
    } else {
      hitOrMiss = 'miss';
      busTransactions.push({ type: 'BusRdX', initiator: coreId, address });
      description.push(`Core ${coreId} WRITE ${address} = ${writeVal}: Cache miss, BusRdX issued`);

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
