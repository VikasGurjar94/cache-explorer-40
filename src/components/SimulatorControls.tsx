import { ProtocolType } from '@/lib/simulator/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs font-mono text-muted-foreground">Protocol</label>
        <Select value={protocol} onValueChange={(v) => onProtocolChange(v as ProtocolType)}>
          <SelectTrigger className="w-28 font-mono text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MSI" className="font-mono">MSI</SelectItem>
            <SelectItem value="MESI" className="font-mono">MESI</SelectItem>
            <SelectItem value="MOESI" className="font-mono">MOESI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-mono text-muted-foreground">Cores</label>
        <Select value={String(coreCount)} onValueChange={(v) => onCoreCountChange(parseInt(v))}>
          <SelectTrigger className="w-16 font-mono text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2" className="font-mono">2</SelectItem>
            <SelectItem value="3" className="font-mono">3</SelectItem>
            <SelectItem value="4" className="font-mono">4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onReset} size="sm" variant="outline" className="gap-1 font-mono">
        <RotateCcw className="h-3 w-3" /> Reset
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
          M
        </span>
        <span className="text-xs font-mono" style={{ color: 'hsl(0, 72%, 51%)' }}>Modified</span>
        <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
          E
        </span>
        <span className="text-xs font-mono" style={{ color: 'hsl(142, 71%, 45%)' }}>Exclusive</span>
        <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
          S
        </span>
        <span className="text-xs font-mono" style={{ color: 'hsl(217, 91%, 60%)' }}>Shared</span>
        <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
          I
        </span>
        <span className="text-xs font-mono" style={{ color: 'hsl(220, 9%, 46%)' }}>Invalid</span>
        {protocol === 'MOESI' && (
          <>
            <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
              O
            </span>
            <span className="text-xs font-mono" style={{ color: 'hsl(25, 95%, 53%)' }}>Owned</span>
          </>
        )}
      </div>
    </div>
  );
}
