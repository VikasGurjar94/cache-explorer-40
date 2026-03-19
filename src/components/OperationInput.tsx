import { useState } from 'react';
import { Operation, OperationType } from '@/lib/simulator/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

interface OperationInputProps {
  coreCount: number;
  operationQueue: Operation[];
  onAddOperation: (op: Operation) => void;
  onRemoveOperation: (index: number) => void;
  onNextStep: () => void;
  onRunAll: () => void;
  hasOperations: boolean;
}

export function OperationInput({
  coreCount,
  operationQueue,
  onAddOperation,
  onRemoveOperation,
  onNextStep,
  onRunAll,
  hasOperations,
}: OperationInputProps) {
  const [coreId, setCoreId] = useState('0');
  const [opType, setOpType] = useState<OperationType>('READ');
  const [address, setAddress] = useState('X');
  const [value, setValue] = useState('10');

  const handleAdd = () => {
    const op: Operation = {
      coreId: parseInt(coreId),
      type: opType,
      address: address.toUpperCase(),
      ...(opType === 'WRITE' ? { value: parseInt(value) || 0 } : {}),
    };
    onAddOperation(op);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1">
          <label className="text-xs font-mono text-muted-foreground">Core</label>
          <Select value={coreId} onValueChange={setCoreId}>
            <SelectTrigger className="w-20 font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: coreCount }, (_, i) => (
                <SelectItem key={i} value={String(i)} className="font-mono">C{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono text-muted-foreground">Operation</label>
          <Select value={opType} onValueChange={(v) => setOpType(v as OperationType)}>
            <SelectTrigger className="w-24 font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="READ" className="font-mono">READ</SelectItem>
              <SelectItem value="WRITE" className="font-mono">WRITE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono text-muted-foreground">Address</label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-20 font-mono text-sm"
            placeholder="X"
          />
        </div>

        {opType === 'WRITE' && (
          <div className="space-y-1">
            <label className="text-xs font-mono text-muted-foreground">Value</label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-20 font-mono text-sm"
              type="number"
            />
          </div>
        )}

        <Button onClick={handleAdd} size="sm" variant="outline" className="gap-1">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {/* Queue */}
      {operationQueue.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground">Queue:</span>
          {operationQueue.map((op, i) => (
            <Badge key={i} variant="secondary" className="font-mono text-xs gap-1 pr-1">
              C{op.coreId} {op.type} {op.address}{op.type === 'WRITE' ? `=${op.value}` : ''}
              <button
                onClick={() => onRemoveOperation(i)}
                className="ml-0.5 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onNextStep} disabled={!hasOperations} size="sm" className="font-mono">
          Next Step
        </Button>
        <Button onClick={onRunAll} disabled={!hasOperations} size="sm" variant="outline" className="font-mono">
          Run All
        </Button>
      </div>
    </div>
  );
}
