import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BusTransaction } from '@/lib/simulator/types';

interface BusVisualizerProps {
  coreCount: number;
  activeSignal: { initiator: number; type: BusTransaction['type']; recipients: number[]; invalidations: number[] } | null;
}

export function BusVisualizer({ coreCount, activeSignal }: BusVisualizerProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!activeSignal) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(t);
  }, [activeSignal]);

  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bus Visualization</div>
          <div className="mt-1 text-sm font-semibold">Signal flow for coherence traffic</div>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {activeSignal ? activeSignal.type : 'Idle'}
        </Badge>
      </div>

      <div className="flex items-center gap-2 justify-center relative">
        {Array.from({ length: coreCount }, (_, i) => {
          const isInitiator = activeSignal?.initiator === i;
          const isRecipient = activeSignal?.recipients.includes(i);
          const isInvalidated = activeSignal?.invalidations.includes(i);
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`h-10 w-10 rounded-full border border-border flex items-center justify-center font-mono text-xs ${
                  isInitiator ? 'bg-emerald-200 text-emerald-800 border-emerald-400' : isRecipient ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-700'
                } ${isInvalidated ? 'animate-pulse bg-red-200 text-red-700 border-red-400' : ''}`}
              >
                C{i}
              </div>
              <span className="text-[10px] text-muted-foreground">Core {i}</span>
            </div>
          );
        })}
        <div
          className={`absolute -translate-y-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-mono ${pulse ? 'animate-pulse' : ''}`}
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          Bus
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground">
        {activeSignal ? (
          <>
            <div>Initiator: Core {activeSignal.initiator}</div>
            <div>Recipients: {activeSignal.recipients.length > 0 ? activeSignal.recipients.map((c) => `C${c}`).join(', ') : 'None'}</div>
            {activeSignal.invalidations.length > 0 && (
              <div className="text-rose-600">Invalidations: {activeSignal.invalidations.map((c) => `C${c}`).join(', ')}</div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground">No active bus traffic yet.</div>
        )}
      </div>
    </div>
  );
}
