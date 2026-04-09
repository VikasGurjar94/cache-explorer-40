export type CacheStateValue = 'M' | 'E' | 'S' | 'I' | 'O';

export type ProtocolType = 'MSI' | 'MESI' | 'MOESI';

export type OperationType = 'READ' | 'WRITE';

export interface CacheLine {
  address: string;
  value: number;
  state: CacheStateValue;
}

export interface CoreCache {
  coreId: number;
  lines: Map<string, CacheLine>;
}

export interface Operation {
  coreId: number;
  type: OperationType;
  address: string;
  value?: number;
}

export type BusTransactionType = 'BusRd' | 'BusRdX' | 'BusUpgr' | 'WriteBack';

export interface BusTransaction {
  type: BusTransactionType;
  initiator: number;
  address: string;
}

export interface LogEntry {
  step: number;
  operation: Operation;
  busTransactions: BusTransaction[];
  stateChanges: {
    coreId: number;
    address: string;
    oldState: CacheStateValue | null;
    newState: CacheStateValue;
  }[];
  memoryUpdates: { address: string; oldValue: number; newValue: number }[];
  hitOrMiss: 'hit' | 'miss';
  description: string[];
  accessTimeNs?: number;
}

export interface SimulatorSnapshot {
  step: number;
  caches: CoreCache[];
  memory: Map<string, number>;
  logs: LogEntry[];
  operation: Operation | null;
}

export interface SimulatorState {
  caches: CoreCache[];
  memory: Map<string, number>;
  logs: LogEntry[];
  operationQueue: Operation[];
  stepCount: number;
  protocol: ProtocolType;
  coreCount: number;
  timelineIndex: number;
  history: SimulatorSnapshot[];
}

export const STATE_COLORS: Record<CacheStateValue, string> = {
  M: 'hsl(0, 72%, 51%)',
  E: 'hsl(142, 71%, 45%)',
  S: 'hsl(217, 91%, 60%)',
  I: 'hsl(220, 9%, 46%)',
  O: 'hsl(25, 95%, 53%)',
};

export const STATE_LABELS: Record<CacheStateValue, string> = {
  M: 'Modified',
  E: 'Exclusive',
  S: 'Shared',
  I: 'Invalid',
  O: 'Owned',
};
