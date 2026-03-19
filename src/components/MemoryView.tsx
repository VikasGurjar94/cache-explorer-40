import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MemoryViewProps {
  memory: Map<string, number>;
}

export function MemoryView({ memory }: MemoryViewProps) {
  const entries = Array.from(memory.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-md border bg-card">
      <div className="px-3 py-2 border-b bg-muted/50">
        <h3 className="font-mono text-sm font-semibold text-foreground">Main Memory</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono text-xs">Address</TableHead>
            <TableHead className="font-mono text-xs">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground text-xs italic">
                No data
              </TableCell>
            </TableRow>
          ) : (
            entries.map(([addr, val]) => (
              <TableRow key={addr}>
                <TableCell className="font-mono text-sm font-medium">{addr}</TableCell>
                <TableCell className="font-mono text-sm">{val}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
