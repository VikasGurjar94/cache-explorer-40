import React, { useEffect, useRef, useState } from 'react';
import { ProtocolType, CoreCache } from '@/lib/simulator/types';

interface StateChange {
  coreId: number;
  oldState: string | null;
  newState: string | null;
}

interface StateGraphProps {
  protocol: ProtocolType;
  stateChanges: StateChange[];
  activeStep: number;
  caches: CoreCache[];
}

const STATE_COLORS: Record<string, string> = {
  INV: '#9ca3af', // gray-400
  MOD: '#ef4444', // red-500
  M: '#ef4444',   // red-500
  EXC: '#f59e0b', // amber-500
  E: '#f59e0b',   // amber-500
  SHR: '#3b82f6', // blue-500
  S: '#3b82f6',   // blue-500
  OWN: '#8b5cf6', // violet-500
  O: '#8b5cf6',   // violet-500
  I: '#9ca3af',   // gray-400
};

interface Point {
  x: number;
  y: number;
}

export function StateGraph({ protocol, stateChanges, activeStep, caches }: StateGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<{ id: string; label: string; p: Point }[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Generate nodes based on protocol
    const newNodes = [];
    let stateList: string[] = [];
    if (protocol === 'MSI') stateList = ['M', 'S', 'I'];
    if (protocol === 'MESI') stateList = ['M', 'E', 'S', 'I'];
    if (protocol === 'MOESI') stateList = ['M', 'O', 'E', 'S', 'I'];

    const centerX = 200;
    const centerY = 160;
    const radius = 100;

    for (let i = 0; i < stateList.length; i++) {
      const angle = (Math.PI * 2 * i) / stateList.length - Math.PI / 2; // Start from top
      newNodes.push({
        id: stateList[i],
        label: stateList[i],
        p: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
      });
    }
    setNodes(newNodes);
  }, [protocol]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Build map of currently active caches
    const activeData = new Map<string, {coreId: number, address: string}[]>();
    
    const parseState = (s: string) => {
      if (s.startsWith('M')) return 'M';
      if (s.startsWith('E')) return 'E';
      if (s.startsWith('O')) return 'O';
      if (s.startsWith('S')) return 'S';
      if (s.startsWith('I')) return 'I';
      return s;
    };

    caches.forEach(cache => {
        cache.lines.forEach(line => {
            if (line.state === 'I' || line.state === 'INV') return; // Hide Invalid lines so it doesn't get cluttered
            const st = parseState(line.state);
            if (!activeData.has(st)) activeData.set(st, []);
            activeData.get(st)!.push({ coreId: cache.coreId, address: line.address });
        });
    });

    let startTime: number | null = null;
    const duration = 1200; // ms for animation

    // Filter valid transitions
    const validTransitions = stateChanges.filter(
      (sc) => sc.oldState && sc.newState && sc.oldState !== sc.newState
    ).map(sc => {
      const fromNode = nodes.find(n => n.id === parseState(sc.oldState!));
      const toNode = nodes.find(n => n.id === parseState(sc.newState!));
      return { coreId: sc.coreId, from: fromNode, to: toNode };
    }).filter(t => t.from && t.to);

    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = validTransitions.length > 0 ? Math.min((timestamp - startTime) / duration, 1) : 1;
      
      // Easing function (easeInOutCubic)
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw all nodes
      nodes.forEach((node) => {
        // Draw edges to all other nodes (faintly)
        nodes.forEach((other) => {
          if (node.id !== other.id) {
            ctx.beginPath();
            ctx.moveTo(node.p.x, node.p.y);
            ctx.lineTo(other.p.x, other.p.y);
            ctx.strokeStyle = '#e5e7eb'; // border color faintly
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.p.x, node.p.y, 24, 0, Math.PI * 2);
        ctx.fillStyle = STATE_COLORS[node.id] || '#9ca3af';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw node label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.p.x, node.p.y);

        // Draw Info Boxes around node showing which caches hold it!
        const holdingCaches = activeData.get(node.id) || [];
        holdingCaches.forEach((entry, idx) => {
            const boxY = node.p.y + 35 + (idx * 20);
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.roundRect(node.p.x - 30, boxY - 10, 60, 18, 4);
            ctx.fill();
            ctx.strokeStyle = STATE_COLORS[node.id];
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#334155';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`C${entry.coreId}:${entry.address}`, node.p.x, boxY);
        });
      });

      // Draw migrating tokens
      if (progress < 1) {
          validTransitions.forEach((tx) => {
            if (!tx.from || !tx.to) return;
            const currentX = tx.from.p.x + (tx.to.p.x - tx.from.p.x) * ease;
            const currentY = tx.from.p.y + (tx.to.p.y - tx.from.p.y) * ease;

            // Glowing trail effect
            const gradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 15);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

            ctx.beginPath();
            ctx.arc(currentX, currentY, 15, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Actual token dot
            ctx.beginPath();
            ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981'; // emerald-500
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Label for token (Core ID)
            ctx.fillStyle = '#065f46'; // dark green
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`C${tx.coreId}`, currentX, currentY - 15);
          });
          animationRef.current = requestAnimationFrame(draw);
      }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, stateChanges, activeStep, caches]);

  return (
    <div className="flex flex-col items-center p-4 bg-background border rounded-xl shadow-sm relative w-full h-[380px]">
        <div className="absolute top-4 left-4 z-10 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
            State Space Data
        </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={320}
        className="mt-6"
        style={{ width: '100%', height: '100%', maxWidth: '400px', maxHeight: '320px' }}
      />
    </div>
  );
}
