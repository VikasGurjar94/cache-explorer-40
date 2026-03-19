import { CoreCache, CacheLine, CacheStateValue } from './types';

export function createCache(coreId: number): CoreCache {
  return { coreId, lines: new Map() };
}

export function createMemory(): Map<string, number> {
  return new Map();
}

export function getCacheLine(cache: CoreCache, address: string): CacheLine | undefined {
  return cache.lines.get(address);
}

export function setCacheLine(cache: CoreCache, address: string, value: number, state: CacheStateValue): CacheLine {
  const line: CacheLine = { address, value, state };
  cache.lines.set(address, line);
  return line;
}

export function updateState(cache: CoreCache, address: string, state: CacheStateValue): void {
  const line = cache.lines.get(address);
  if (line) {
    line.state = state;
  }
}

export function cloneCaches(caches: CoreCache[]): CoreCache[] {
  return caches.map(c => ({
    coreId: c.coreId,
    lines: new Map(Array.from(c.lines.entries()).map(([k, v]) => [k, { ...v }])),
  }));
}

export function cloneMemory(memory: Map<string, number>): Map<string, number> {
  return new Map(memory);
}
