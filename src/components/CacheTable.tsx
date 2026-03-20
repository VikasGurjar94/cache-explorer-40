import { CoreCache, STATE_COLORS, STATE_LABELS, CacheStateValue } from '@/lib/simulator/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CacheTableProps {
  cache: CoreCache;
  activeCoreId?: number | null;
}

function StateBadge({ state }: { state: CacheStateValue }) {
  return (
    <Badge
      variant="outline"
      className="font-mono font-bold text-xs border-2"
      style={{ color: STATE_COLORS[state], borderColor: STATE_COLORS[state] }}
    >
      {state} ({STATE_LABELS[state]})
    </Badge>
  );
}

export function CacheTable({ cache, activeCoreId = null }: CacheTableProps) {
  const lines = Array.from(cache.lines.values());

  return (
    <div
      className={`rounded-md border bg-card ${
        activeCoreId === cache.coreId ? 'ring-2 ring-primary/40 border-primary/50' : ''
      }`}
    >
      <div className="px-3 py-2 border-b bg-muted/50">
        <h3 className="font-mono text-sm font-semibold text-foreground">
          Core {cache.coreId}
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono text-xs">Address</TableHead>
            <TableHead className="font-mono text-xs">Value</TableHead>
            <TableHead className="font-mono text-xs">State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground text-xs italic">
                Empty
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line) => (
              <TableRow key={line.address}>
                <TableCell className="font-mono text-sm font-medium">{line.address}</TableCell>
                <TableCell className="font-mono text-sm">{line.value}</TableCell>
                <TableCell><StateBadge state={line.state} /></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
