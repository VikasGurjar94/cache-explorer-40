import { LogEntry, ProtocolType } from './types';

function explainStateTransition(change: LogEntry['stateChanges'][number]): string {
  const { coreId, address, oldState, newState } = change;
  if (oldState === null) {
    return `Core ${coreId} allocates ${address} in ${newState} state.`;
  }
  if (oldState === newState) {
    return `Core ${coreId} keeps ${address} in ${newState} state.`;
  }
  return `Core ${coreId} transitions ${address} from ${oldState} → ${newState}.`;
}

function explainBusTransaction(tx: LogEntry['busTransactions'][number]): string {
  const { type, initiator, address } = tx;
  if (type === 'BusRd') {
    return `BusRd: Core ${initiator} asks for ${address} from other caches.`;
  }
  if (type === 'BusRdX') {
    return `BusRdX: Core ${initiator} requests exclusive write access to ${address}.`;
  }
  if (type === 'BusUpgr') {
    return `BusUpgr: Core ${initiator} upgrades its line for a write and invalidates sharers.`;
  }
  if (type === 'Flush') {
    return `Flush: A dirty line for ${address} is written back to memory.`;
  }
  return `Bus action ${type} on ${address}.`;
}

function explainMemoryUpdate(update: LogEntry['memoryUpdates'][number]): string {
  return `Memory ${update.address} updated ${update.oldValue} → ${update.newValue}.`;
}

function operationSummary(operation: LogEntry['operation']): string {
  if (operation.type === 'READ') {
    return `Operation: Core ${operation.coreId} reads ${operation.address}.`;
  }
  return `Operation: Core ${operation.coreId} writes ${operation.address} = ${operation.value ?? 0}.`;
}

export function generateLearningSteps(log: LogEntry, protocol: ProtocolType): string[] {
  const steps: string[] = [];
  steps.push(operationSummary(log.operation));

  const isRead = log.operation.type === 'READ';
  if (log.hitOrMiss === 'hit') {
    steps.push(`Result: This was a cache hit under ${protocol}. No miss handling was needed.`);
  } else {
    steps.push(`Result: This was a cache miss under ${protocol}. The bus and other caches were consulted.`);
  }

  if (isRead) {
    steps.push(`Read details: A core can read shared data from memory or from another cache's modified/owned line.`);
  } else {
    steps.push(`Write details: A write requires exclusive ownership. Other caches may be invalidated.`);
  }

  if (log.busTransactions.length > 0) {
    steps.push('Bus traffic:');
    for (const tx of log.busTransactions) {
      steps.push(`• ${explainBusTransaction(tx)}`);
    }
  } else {
    steps.push('Bus traffic: No bus requests were needed.');
  }

  if (log.stateChanges.length > 0) {
    steps.push('State transitions:');
    for (const change of log.stateChanges) {
      steps.push(`• ${explainStateTransition(change)}`);
    }
  } else {
    steps.push('State transitions: No cache state changed for this step.');
  }

  if (log.memoryUpdates.length > 0) {
    steps.push('Memory updates:');
    for (const update of log.memoryUpdates) {
      steps.push(`• ${explainMemoryUpdate(update)}`);
    }
  }

  steps.push('Tip: In MSI/MESI/MOESI, invalidation keeps caches coherent when writes happen.');
  return steps;
}

export function summarizeLog(log: LogEntry): string {
  if (log.description.length > 0) {
    return log.description[0];
  }
  return `${log.operation.type} ${log.operation.address} by Core ${log.operation.coreId}`;
}
