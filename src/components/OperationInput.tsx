import { useState } from 'react';
import { Operation, OperationType } from '@/lib/simulator/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Play, FastForward } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Operation Building Form */}
      <div className="space-y-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Add Operation
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500">Core</label>
            <Select value={coreId} onValueChange={setCoreId}>
              <SelectTrigger className="w-full font-mono text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: coreCount }, (_, i) => (
                  <SelectItem key={i} value={String(i)} className="font-mono">C{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500">Address</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full font-mono text-sm h-8"
              placeholder="X"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-500 block">Type</label>
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
            {['READ', 'WRITE'].map((type) => (
              <button
                key={type}
                onClick={() => setOpType(type as OperationType)}
                className={`flex-1 text-[11px] font-mono py-1 rounded-md transition-colors ${
                  opType === type
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {opType === 'WRITE' && (
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500">Value</label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full font-mono text-sm h-8"
              type="number"
            />
          </div>
        )}

        <Button onClick={handleAdd} size="sm" variant="secondary" className="w-full gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Enqueue
        </Button>
      </div>

      {/* Queue View */}
      {operationQueue.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between items-center">
            Pending Queue 
            <span className="bg-primary/10 text-primary px-1.5 rounded">{operationQueue.length}</span>
          </label>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {operationQueue.map((op, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/30 border border-border rounded px-2 py-1.5 group">
                <div className="text-xs font-mono">
                  <span className="font-semibold text-primary mr-1">C{op.coreId}</span>
                  {op.type} {op.address}
                  {op.type === 'WRITE' ? <span className="text-muted-foreground text-[10px] ml-1">={op.value}</span> : ''}
                </div>
                <button
                  onClick={() => onRemoveOperation(i)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Controls */}
      <div className="pt-4 border-t border-border grid grid-cols-2 gap-2">
        <Button onClick={onNextStep} disabled={!hasOperations} size="sm" className="font-mono text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700">
          <Play className="h-3 w-3 fill-current" /> Step
        </Button>
        <Button onClick={onRunAll} disabled={!hasOperations} size="sm" variant="outline" className="font-mono text-xs h-8 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <FastForward className="h-3 w-3 fill-current" /> Run All
        </Button>
      </div>
    </div>
  );
}
