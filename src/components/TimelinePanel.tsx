import { ProtocolType, SimulatorSnapshot } from '@/lib/simulator/types';
import { Button } from '@/components/ui/button';
import { Rewind, FastForward, RotateCcw } from 'lucide-react';

interface TimelinePanelProps {
  history: SimulatorSnapshot[];
  selectedIndex: number;
  protocol: ProtocolType;
  onSelect: (index: number) => void;
  onReset: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onJumpTo: (index: number) => void;
}

export function TimelinePanel({
  history,
  selectedIndex,
  onSelect,
  onReset,
  onStepBackward,
  onStepForward,
  onJumpTo,
}: TimelinePanelProps) {
  return (
    <div className="rounded-md border bg-card h-full flex flex-col">
      <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-mono text-sm font-semibold text-foreground">Timeline</h3>
          <p className="text-[10px] text-muted-foreground">Review and replay your simulation steps.</p>
        </div>
        <div className="flex gap-1">
          <Button onClick={onReset} size="sm" variant="outline" className="font-mono">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>
      </div>
      <div className="p-2 border-b border-border flex items-center gap-1 flex-wrap">
        <Button size="sm" variant="outline" className="font-mono" onClick={onStepBackward}>
          <Rewind className="h-3 w-3" /> Back
        </Button>
        <Button size="sm" variant="outline" className="font-mono" onClick={onStepForward}>
          Forward <FastForward className="h-3 w-3" />
        </Button>
      </div>
      <div className="px-2 py-2 border-b border-border flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">Jump to step:</span>
        <input
          className="h-7 w-16 rounded border border-border bg-background px-2 text-xs font-mono outline-none focus:border-primary"
          type="number"
          min={0}
          max={Math.max(0, history.length - 1)}
          defaultValue={Math.max(0, selectedIndex)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(v) && v >= 0 && v < history.length) onJumpTo(v);
            }
          }}
          placeholder="0"
        />
        <Button size="sm" variant="outline" className="font-mono" onClick={() => onJumpTo(selectedIndex)}>
          Go
        </Button>
      </div>
      <div className="flex-1 overflow-auto px-2 py-2 space-y-1">
        {history.length === 0 ? (
          <div className="text-xs text-muted-foreground">No timeline yet.</div>
        ) : (
          history.map((snapshot, idx) => {
            const operation = snapshot.operation;
            const log = snapshot.logs[snapshot.logs.length - 1];
            const summary = log ? log.description[0] : 'Initial state';
            return (
              <button
                key={`${snapshot.step}-${idx}`}
                onClick={() => onSelect(idx)}
                className={`w-full text-left rounded border p-2 text-xs font-mono transition-colors duration-150 ${
                  idx === selectedIndex
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{idx}</span>
                  <span>{operation ? `Core ${operation.coreId} ${operation.type}` : 'Start'}</span>
                  {operation && operation.address && <span className="text-muted-foreground">{operation.address}</span>}
                  {operation?.type === 'WRITE' && <span className="text-muted-foreground">= {operation.value}</span>}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground truncate">{summary}</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
