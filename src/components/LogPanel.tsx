import { LogEntry, STATE_COLORS } from '@/lib/simulator/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface LogPanelProps {
  logs: LogEntry[];
}

export function LogPanel({ logs }: LogPanelProps) {
  return (
    <div className="rounded-md border bg-card h-full flex flex-col">
      <div className="px-3 py-2 border-b bg-muted/50">
        <h3 className="font-mono text-sm font-semibold text-foreground">Execution Log</h3>
      </div>
      <ScrollArea className="flex-1 p-3">
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-xs italic text-center mt-4">
            No operations executed yet. Add operations and click "Next Step".
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.step} className="rounded border bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    Step {log.step}
                  </Badge>
                  <span className="font-mono text-xs font-medium text-foreground">
                    Core {log.operation.coreId} {log.operation.type} {log.operation.address}
                    {log.operation.type === 'WRITE' ? ` = ${log.operation.value}` : ''}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs ml-auto"
                    style={{
                      color: log.hitOrMiss === 'hit' ? STATE_COLORS['E'] : STATE_COLORS['M'],
                      borderColor: log.hitOrMiss === 'hit' ? STATE_COLORS['E'] : STATE_COLORS['M'],
                    }}
                  >
                    {log.hitOrMiss.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-0.5">
                  {log.description.map((line, i) => (
                    <p key={i} className="font-mono text-xs text-muted-foreground pl-2 border-l-2 border-border">
                      {line}
                    </p>
                  ))}
                </div>
                {log.busTransactions.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {log.busTransactions.map((tx, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs">
                        {tx.type}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
