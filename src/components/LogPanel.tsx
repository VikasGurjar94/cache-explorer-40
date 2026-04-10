import { useState } from 'react';
import { LogEntry, STATE_COLORS, ProtocolType } from '@/lib/simulator/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateLearningSteps, summarizeLog } from '@/lib/simulator/explanation';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

interface LogPanelProps {
  logs: LogEntry[];
  protocol: ProtocolType;
}

function LogEntryItem({ log, protocol }: { log: LogEntry; protocol: ProtocolType }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = summarizeLog(log);
  const steps = isExpanded ? generateLearningSteps(log, protocol) : [];

  return (
    <div className="relative pl-4 border-l-2 border-slate-200 hover:border-indigo-300 transition-colors space-y-2 pb-2">
      <div className="absolute top-0 left-[-5px] w-2 h-2 rounded-full bg-indigo-200 ring-4 ring-slate-50"></div>
      
      <div className="flex items-start justify-between gap-2 mt-[-2px]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Step {log.step}
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-800">
            C{log.operation.coreId} {log.operation.type} {log.operation.address}
            {log.operation.type === 'WRITE' ? `=${log.operation.value}` : ''}
          </span>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors"
        >
          <Info className="w-3 h-3" />
          {isExpanded ? 'Hide Details' : 'Explain'}
        </button>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
          {log.accessTimeNs !== undefined && (
            <span
              className="font-mono text-[10px] font-medium"
              style={{ color: log.accessTimeNs <= 17 ? STATE_COLORS['E'] : (log.accessTimeNs > 100 ? STATE_COLORS['M'] : STATE_COLORS['O']) }}
            >
              ⏱️ {log.accessTimeNs}ns
            </span>
          )}
          
          <span
            className="font-mono text-[10px] font-bold tracking-wider"
            style={{ color: log.hitOrMiss === 'hit' ? STATE_COLORS['E'] : STATE_COLORS['M'] }}
          >
            {log.hitOrMiss.toUpperCase()}
          </span>

          {log.isPrefetch && (
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ⚡ PPC
            </span>
          )}

          {log.busTransactions.length > 0 && (
            <div className="flex gap-1">
              {log.busTransactions.map((tx, i) => (
                <span key={i} className="font-mono text-[9px] px-1 bg-slate-100 text-slate-500 rounded border border-slate-200">
                  {tx.type}
                </span>
              ))}
            </div>
          )}
      </div>
      
      <div className="text-[10px] font-mono text-slate-500 leading-relaxed">
        {summary}
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-1 text-[10px] font-mono text-slate-700 bg-slate-50 rounded border border-slate-200 p-2">
          {steps.map((line, i) => (
            <div key={`${log.step}-${i}`} className="flex gap-1.5">
              <span className="font-bold text-slate-400">{i + 1}.</span> 
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LogPanel({ logs, protocol }: LogPanelProps) {
  return (
    <div className="h-full flex flex-col bg-transparent">
      <ScrollArea className="flex-1 p-2 custom-scrollbar pr-4">
        {logs.length === 0 ? (
          <p className="text-slate-400 text-[11px] uppercase tracking-widest font-semibold font-mono text-center mt-6">
            Awaiting Activity...
          </p>
        ) : (
          <div className="space-y-4 pt-1 pb-4">
            {logs.map((log) => (
              <LogEntryItem key={log.step} log={log} protocol={protocol} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
