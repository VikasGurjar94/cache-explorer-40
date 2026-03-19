import { CoreCache, BusTransaction, Operation, LogEntry } from '../types';
import { getCacheLine, setCacheLine, updateState } from '../cache';

export function executeMOESI(
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
      let suppliedValue: number | null = null;

      for (const other of caches) {
        if (other.coreId === coreId) continue;
        const otherLine = getCacheLine(other, address);
        if (!otherLine || otherLine.state === 'I') continue;

        if (otherLine.state === 'M') {
          // M → O, supply data (no flush to memory in MOESI!)
          suppliedValue = otherLine.value;
          stateChanges.push({ coreId: other.coreId, address, oldState: 'M', newState: 'O' });
          updateState(other, address, 'O');
          description.push(`Core ${other.coreId} transitions M → Owned, supplies data`);
          anySharer = true;
        } else if (otherLine.state === 'O') {
          suppliedValue = otherLine.value;
          anySharer = true;
          description.push(`Core ${other.coreId} supplies data from Owned state`);
        } else if (otherLine.state === 'E') {
          stateChanges.push({ coreId: other.coreId, address, oldState: 'E', newState: 'S' });
          updateState(other, address, 'S');
          suppliedValue = otherLine.value;
          description.push(`Core ${other.coreId} transitions E → S`);
          anySharer = true;
        } else if (otherLine.state === 'S') {
          anySharer = true;
        }
      }

      const memVal = suppliedValue ?? memory.get(address)!;
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
    } else if (line && (line.state === 'S' || line.state === 'O')) {
      hitOrMiss = 'hit';
      const txType = line.state === 'O' ? 'BusUpgr' as const : 'BusUpgr' as const;
      busTransactions.push({ type: txType, initiator: coreId, address });
      description.push(`Core ${coreId} WRITE ${address} = ${writeVal}: Hit in ${line.state}, BusUpgr issued`);

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
      hitOrMiss = 'miss';
      busTransactions.push({ type: 'BusRdX', initiator: coreId, address });
      description.push(`Core ${coreId} WRITE ${address} = ${writeVal}: Cache miss, BusRdX issued`);

      for (const other of caches) {
        if (other.coreId === coreId) continue;
        const otherLine = getCacheLine(other, address);
        if (!otherLine || otherLine.state === 'I') continue;

        if (otherLine.state === 'M' || otherLine.state === 'O') {
          // In MOESI, owned/modified data doesn't need flush to memory on invalidation
          description.push(`Core ${other.coreId} supplies dirty data`);
        }
        stateChanges.push({ coreId: other.coreId, address, oldState: otherLine.state, newState: 'I' });
        updateState(other, address, 'I');
        description.push(`Core ${other.coreId} invalidated`);
      }

      const oldState = line?.state || null;
      setCacheLine(cache, address, writeVal, 'M');
      stateChanges.push({ coreId, address, oldState, newState: 'M' });
      description.push(`Core ${coreId} state → Modified`);
    }
  }

  return { step, operation, busTransactions, stateChanges, memoryUpdates, hitOrMiss, description };
}
