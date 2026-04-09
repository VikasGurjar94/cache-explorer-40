import { LogEntry, STATE_COLORS, ProtocolType } from '@/lib/simulator/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { generateLearningSteps, summarizeLog } from '@/lib/simulator/explanation';

interface LogPanelProps {
  logs: LogEntry[];
  learningMode: boolean;
  protocol: ProtocolType;
}

export function LogPanel({ logs, learningMode, protocol }: LogPanelProps) {
  return (
    <div className="rounded-md border bg-card h-full flex flex-col">
      <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold text-foreground">Execution Log</h3>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] bg-primary/10 text-primary">
          {learningMode ? 'Learning ON' : 'Compact Mode'}
        </span>
      </div>
      <ScrollArea className="flex-1 p-3">
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-xs italic text-center mt-4">
            No operations executed yet. Add operations and click "Next Step".
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const steps = learningMode ? generateLearningSteps(log, protocol) : [];
              const summary = summarizeLog(log);
              return (
                <div key={log.step} className="rounded border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      Step {log.step}
                    </Badge>
                    <span className="font-mono text-xs font-medium text-foreground">
                      Core {log.operation.coreId} {log.operation.type} {log.operation.address}
                      {log.operation.type === 'WRITE' ? ` = ${log.operation.value}` : ''}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      {log.accessTimeNs !== undefined && (
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs shadow-sm bg-background border"
                          style={{
                            color: log.accessTimeNs <= 17 ? STATE_COLORS['E'] : (log.accessTimeNs > 100 ? STATE_COLORS['M'] : STATE_COLORS['O']),
                            borderColor: log.accessTimeNs <= 17 ? STATE_COLORS['E'] : (log.accessTimeNs > 100 ? STATE_COLORS['M'] : STATE_COLORS['O']),
                          }}
                        >
                          ⏱️ {log.accessTimeNs}ns
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          color: log.hitOrMiss === 'hit' ? STATE_COLORS['E'] : STATE_COLORS['M'],
                          borderColor: log.hitOrMiss === 'hit' ? STATE_COLORS['E'] : STATE_COLORS['M'],
                        }}
                      >
                        {log.hitOrMiss.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground pl-2 border-l-2 border-border">
                    {learningMode ? 'Detailed explanation:' : summary}
                  </div>

                  {learningMode ? (
                    <div className="mt-1 space-y-1 text-xs font-mono text-foreground">
                      {steps.map((line, i) => (
                        <div key={`${log.step}-${i}`} className="rounded-md bg-background/70 p-2 border border-border">
                          <span className="font-semibold">{i + 1}.</span> {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-muted-foreground">
                      {log.description.slice(0, 2).map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  )}

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
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
