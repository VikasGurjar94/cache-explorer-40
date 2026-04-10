import { ProtocolType } from '@/lib/simulator/types';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SimulatorControlsProps {
  protocol: ProtocolType;
  coreCount: number;
  onProtocolChange: (p: ProtocolType) => void;
  onCoreCountChange: (n: number) => void;
  onReset: () => void;
}

export function SimulatorControls({
  protocol,
  coreCount,
  onProtocolChange,
  onCoreCountChange,
  onReset,
}: SimulatorControlsProps) {
  return (
    <div className="space-y-6">
      {/* Protocol Selection */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Protocol</label>
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
          {['MSI', 'MESI', 'MOESI'].map((p) => (
            <button
              key={p}
              onClick={() => onProtocolChange(p as ProtocolType)}
              className={`flex-1 text-xs font-mono py-1.5 rounded-md transition-colors ${
                protocol === p
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Core Count */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cores</label>
        <div className="flex gap-2">
          {[2, 3, 4].map((c) => (
            <button
              key={c}
              onClick={() => onCoreCountChange(c)}
              className={`flex-1 text-xs font-mono py-1.5 rounded-md border transition-colors ${
                coreCount === c
                  ? 'bg-primary/10 border-primary text-foreground'
                  : 'bg-background border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={onReset} size="sm" variant="outline" className="w-full gap-2 font-mono">
        <RotateCcw className="h-3.5 w-3.5" /> Force Reset
      </Button>

      {/* Legend */}
      <div className="pt-4 border-t border-border">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block">
          State Legend
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 text-center text-[10px] font-mono py-0.5 rounded bg-muted">M</span>
            <span className="text-xs font-mono text-red-600">Modified</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-center text-[10px] font-mono py-0.5 rounded bg-muted">E</span>
            <span className="text-xs font-mono text-emerald-600">Exclusive</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-center text-[10px] font-mono py-0.5 rounded bg-muted">S</span>
            <span className="text-xs font-mono text-blue-600">Shared</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-center text-[10px] font-mono py-0.5 rounded bg-muted">I</span>
            <span className="text-xs font-mono text-slate-500">Invalid</span>
          </div>
          {protocol === 'MOESI' && (
            <div className="flex items-center gap-2">
              <span className="w-6 text-center text-[10px] font-mono py-0.5 rounded bg-muted">O</span>
              <span className="text-xs font-mono text-amber-500">Owned</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
