import { ArrowLeft, BookOpen, Layers, GitMerge, AlertTriangle, ExternalLink, Cpu, HardDrive, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const Learn = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-24">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Simulator
            </Link>
          </div>
          <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Cache Coherence In-Depth
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-16 px-6">
        {/* Title Section */}
        <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6">
            <Layers className="w-3.5 h-3.5" /> Core Architectural Concept
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Understanding Cache Coherence
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A step-by-step masterclass on how modern multi-core processors prevent data corruption when sharing memory.
          </p>
        </div>

        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">

          {/* Core Problem Block */}
          <section className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-100 to-orange-100 rounded-3xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-500 ease-out shadow-sm"></div>
            <div className="relative bg-white p-8 md:p-12 rounded-3xl border border-rose-100 shadow-xl">
              <h2 className="text-3xl font-extrabold flex items-center gap-3 mb-6 text-slate-900">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
                The Problem
              </h2>
              <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
                <p>
                  In a modern computer, the Main Memory (RAM) is very slow compared to the CPU. If the CPU had to wait for RAM every time it needed data, your computer would crawl. To fix this, engineers added small, ultra-fast memory chips directly onto the CPU called <strong>Caches (L1, L2, L3)</strong>.
                </p>
                <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 transform transition-transform hover:-translate-y-1">
                  <h3 className="font-bold text-rose-900 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-500" /> The Multi-Core Crisis
                  </h3>
                  <p className="text-base">
                    When you have multiple CPU cores (like a quad-core processor), each core has its own private L1 cache. Imagine variable <code>X = 5</code> in Main Memory.
                  </p>
                  <ul className="mt-4 space-y-2 text-base list-decimal pl-5">
                    <li>Core 0 reads <code>X</code>. Its cache now stores <code>X = 5</code>.</li>
                    <li>Core 1 reads <code>X</code>. Its cache now stores <code>X = 5</code>.</li>
                    <li>Core 0 decides to add 10 to X. Core 0 updates its cache so <code>X = 15</code>.</li>
                  </ul>
                  <p className="mt-4 font-semibold text-rose-700">
                    Disaster: Core 1 still thinks <code>X = 5</code>! If Core 1 uses X for a bank transaction, the math will be completely wrong. This is the <strong>Cache Incoherence</strong> problem.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Solutions Section */}
          <section>
            <h2 className="text-3xl font-extrabold mb-8 text-slate-900 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              The Solutions
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Snooping */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <GitMerge className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                  Snooping Protocols
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Used in almost all consumer laptops and desktops. All caches are connected to a single shared wire called a <strong>Bus</strong>. Think of a group of people sitting around a table.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 space-y-3">
                  <p><strong>How it works:</strong> If Core 0 wants to write to <code>X</code>, it shouts across the Bus: <em>"Hey, I am modifying X!"</em>.</p>
                  <p>Every other Core "snoops" (listens) to the bus. When Core 1 hears this, it immediately throws away its copy of <code>X</code> (invalidates it).</p>
                  <p className="text-emerald-700 font-semibold mt-2">✓ Very fast. <span className="text-rose-600 font-normal">✗ Doesn't scale beyond ~16 cores because the bus gets too noisy.</span></p>
                </div>
              </div>

              {/* Directory */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-teal-300 transition-all duration-300 group">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <HardDrive className="w-6 h-6 text-teal-500 group-hover:scale-110 transition-transform" />
                  Directory Protocols
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Used in massive enterprise servers with dozens or hundreds of cores (like 64-core EPYC servers), where a single shared bus would be impossible.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 space-y-3">
                  <p><strong>How it works:</strong> There is a central "Directory" (like a librarian's ledger) next to Main Memory.</p>
                  <p>The Directory explicitly writes down: <em>"Core 0 and Core 1 have a copy of X."</em> When Core 0 wants to write, it asks the Directory. The Directory sends targeted "invalidate" text messages directly to Core 1.</p>
                  <p className="text-emerald-700 font-semibold mt-2">✓ Scales infinitely. <span className="text-rose-600 font-normal">✗ Slower due to directory lookups.</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* Deep Protocol Dive (MSI & MESI) */}
          <section className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden text-slate-300 border border-slate-800">
            <div className="p-8 md:p-12 border-b border-indigo-900/50 relative overflow-hidden">
              <div className="absolute top-0 right-[-10%] opacity-10">
                <Cpu className="w-64 h-64 text-indigo-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">
                State Machines (The Rules)
              </h2>
              <p className="text-lg text-indigo-200 max-w-2xl relative z-10">
                To make Snooping work, engineers give every block of data in the cache a "State". The protocol dictates how these states change during Reads, Writes, and Bus snoops.
              </p>
            </div>
            
            <div className="p-8 md:p-12 space-y-16">
              
              {/* MSI Details */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-full"></div>
                <div className="pl-8">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    The MSI Protocol
                    <span className="text-xs font-semibold py-1 px-3 bg-indigo-500/20 text-indigo-300 rounded-full">The Foundation</span>
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-800/80 p-6 rounded-2xl border border-rose-500/30 hover:border-rose-500/80 transition-colors">
                      <div className="text-3xl font-black text-rose-500 mb-2">M</div>
                      <div className="font-bold text-white mb-2">Modified</div>
                      <p className="text-sm">I have changed this data. I am the <strong>only one</strong> who has it. The Main Memory is outdated. If someone else asks for it, I must intercept it and supply the data.</p>
                    </div>
                    <div className="bg-slate-800/80 p-6 rounded-2xl border border-blue-500/30 hover:border-blue-500/80 transition-colors">
                      <div className="text-3xl font-black text-blue-500 mb-2">S</div>
                      <div className="font-bold text-white mb-2">Shared</div>
                      <p className="text-sm">I have this data, and it is <strong>clean</strong> (matches Main Memory). Others might have it too. I can only READ it. To write, I must switch to M and invalidate others.</p>
                    </div>
                    <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-600/50 hover:border-slate-500 transition-colors">
                      <div className="text-3xl font-black text-slate-500 mb-2">I</div>
                      <div className="font-bold text-white mb-2">Invalid</div>
                      <p className="text-sm">I don't have this data, or someone else modified it. Accessing this generates a Cache Miss.</p>
                    </div>
                  </div>

                  {/* MSI Example */}
                  <div className="bg-black/40 rounded-2xl p-6 border border-white/10 font-mono text-sm leading-8">
                    <div className="text-indigo-400 font-bold mb-4 font-sans tracking-widest text-xs uppercase">Example Walkthrough</div>
                    <div><span className="text-slate-500">Step 1:</span> Core 0 Reads X. <span className="text-emerald-400">Miss.</span> Memory gives X to Core 0. State is <span className="text-blue-400">Shared (S)</span>.</div>
                    <div><span className="text-slate-500">Step 2:</span> Core 1 Reads X. <span className="text-emerald-400">Miss.</span> Memory gives X to Core 1. State is <span className="text-blue-400">Shared (S)</span>.</div>
                    <div><span className="text-slate-500">Step 3:</span> Core 0 Writes X. Core 0 shouts "Invalidate!" Core 1's X becomes <span className="text-slate-500">Invalid (I)</span>. Core 0's X becomes <span className="text-rose-400">Modified (M)</span>.</div>
                  </div>
                </div>
              </div>

              {/* MESI Details */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-full"></div>
                <div className="pl-8">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    The MESI Protocol
                    <span className="text-xs font-semibold py-1 px-3 bg-emerald-500/20 text-emerald-300 rounded-full">The Optimization</span>
                  </h3>
                  
                  <p className="mb-6">
                    What if Core 0 reads a variable (State: Shared), and then immediately writes to it? In MSI, Core 0 must shout an "Invalidation" on the bus. But what if Core 0 is the <em>only</em> core that read it? Shouting on the bus is a waste of time and power. <strong>MESI adds an E state to fix this.</strong>
                  </p>

                  <div className="bg-slate-800/80 p-8 rounded-2xl border border-emerald-500/50 mb-8 transform hover:-translate-y-2 transition-all duration-300 shadow-lg shadow-emerald-900/20">
                    <div className="text-4xl font-black text-emerald-500 mb-2">E <span className="text-xl text-white font-bold tracking-normal ml-2">- Exclusive</span></div>
                    <p className="text-base text-emerald-100">
                      I have this data, it is <strong>clean</strong>, and I know for a fact <strong>nobody else has it</strong>. <br/><br/>
                      <strong>The Magic:</strong> Because I know I'm alone, if I decide to Write to this data later, I can silently upgrade to <strong>Modified (M)</strong> without putting a single signal on the bus!
                    </p>
                  </div>

                  {/* MESI Example */}
                  <div className="bg-black/40 rounded-2xl p-6 border border-white/10 font-mono text-sm leading-8">
                    <div className="text-emerald-400 font-bold mb-4 font-sans tracking-widest text-xs uppercase">Example Walkthrough</div>
                    <div><span className="text-slate-500">Step 1:</span> Core 0 Reads X. <span className="text-emerald-400">Miss.</span> Bus sees nobody else has it. Core 0 gets X. State is <span className="text-emerald-400">Exclusive (E)</span>.</div>
                    <div><span className="text-slate-500">Step 2:</span> Core 0 Writes X. Core 0 notices it is in E. <span className="text-indigo-300">It silently changes state to</span> <span className="text-rose-400">Modified (M)</span>. No bus traffic! Huge performance win.</div>
                    <div><span className="text-slate-500">Step 3:</span> Core 1 Reads X. Core 0 hears this. Core 0 pushes X to memory and Core 1. Both now become <span className="text-blue-400">Shared (S)</span>.</div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Interactive Footer element */}
          <div className="flex flex-col items-center text-center p-12 bg-white rounded-3xl border border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin-slow" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Seeing is Believing</h3>
            <p className="text-slate-600 mb-8 max-w-lg leading-relaxed">
              Now that you understand the theory, the absolute best way to cement this knowledge is to play with the interactive visualizer. Select MESI, set it to 2 Cores, and queue up identical Operations to watch the states flip!
            </p>
            <Link to="/" className="inline-flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-1 transition-all">
              Go to Simulator
              <ExternalLink className="w-5 h-5" />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Learn;
