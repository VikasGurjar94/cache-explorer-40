import { Operation, ProtocolType } from './types';

export interface ScenarioPreset {
  id: string;
  title: string;
  description: string;
  operations: Operation[];
  supportedProtocols?: ProtocolType[];
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'read-sharing',
    title: 'Basic Read Sharing',
    description: 'Two cores read the same line and share it in S/E states.',
    operations: [
      { coreId: 0, type: 'READ', address: 'A' },
      { coreId: 1, type: 'READ', address: 'A' },
    ],
  },
  {
    id: 'write-invalidation',
    title: 'Write Invalidation',
    description: 'A write invalidates shared lines in other caches.',
    operations: [
      { coreId: 0, type: 'READ', address: 'A' },
      { coreId: 1, type: 'READ', address: 'A' },
      { coreId: 0, type: 'WRITE', address: 'A', value: 5 },
    ],
  },
  {
    id: 'exclusive-upgrade',
    title: 'Exclusive-to-Modified Upgrade',
    description: 'Read first gets exclusive, then write upgrades to modified.',
    operations: [
      { coreId: 0, type: 'READ', address: 'B' },
      { coreId: 0, type: 'WRITE', address: 'B', value: 99 },
    ],
    supportedProtocols: ['MESI', 'MOESI'],
  },
  {
    id: 'false-sharing',
    title: 'False Sharing Demo',
    description: 'Two cores write to different addresses on same cache line conceptually.',
    operations: [
      { coreId: 0, type: 'WRITE', address: 'A', value: 1 },
      { coreId: 1, type: 'WRITE', address: 'B', value: 2 },
      { coreId: 0, type: 'READ', address: 'B' },
    ],
  },
  {
    id: 'write-write-conflict',
    title: 'Write-Write Conflict',
    description: 'Two writes to same address from different cores create invalidations.',
    operations: [
      { coreId: 0, type: 'WRITE', address: 'C', value: 10 },
      { coreId: 1, type: 'WRITE', address: 'C', value: 20 },
    ],
  },
  {
    id: 'mixed-sequence',
    title: 'Mixed Read/Write Sequence',
    description: 'A mix of reads and writes showing sharing then invalidation.',
    operations: [
      { coreId: 0, type: 'READ', address: 'D' },
      { coreId: 1, type: 'READ', address: 'D' },
      { coreId: 2, type: 'WRITE', address: 'D', value: 7 },
      { coreId: 1, type: 'READ', address: 'D' },
    ],
  },
];
