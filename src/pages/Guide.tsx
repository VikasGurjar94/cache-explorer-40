import { ArrowLeft, Play, RefreshCw, Plus, Trash2, Settings, Zap, Cpu, Activity, Database, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';

const Guide = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* Header element for navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Simulator
            </Link>
          </div>
          <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-500" />
            Interactive Guide
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            How to use Cache Explorer
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A comprehensive manual on navigating the Cache Coherence Simulator to understand modern multi-core architectures. Find out what each button does and how to read the visualizer.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="space-y-12 relative animate-in fade-in slide-in-from-bottom-6 duration-1000">
          
          {/* Section: Left Panel Controls */}
          <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">1. Simulator Controls</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 text-slate-600 leading-relaxed">
              <div>
                <p className="mb-4">
                  The left panel is your command center. Here you dictate the architecture of the system.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-600 text-xs font-bold">A</span>
                    <div>
                      <strong className="text-slate-800 block">Protocol Selection</strong>
                      Choose the coherence protocol (MSI, MESI, MOESI). This changes the rules the caches follow when sharing data.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-600 text-xs font-bold">B</span>
                    <div>
                      <strong className="text-slate-800 block">Core Count</strong>
                      Adjust the number of CPU cores simulated (typically 2 to 4). More cores mean more complex interactions.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <strong className="text-slate-800">PPC Mode Toggle</strong>
                </div>
                <p className="text-sm">
                  Turn on <strong>Predictive Prefetching Mode</strong> to see how modern processors guess what memory will be needed next and load it ahead of time. Watch the metrics panel see the "Hits" skyrocket when a pattern is recognized!
                </p>
              </div>
            </div>
          </section>

          {/* Section: Queue Operations */}
          <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <Play className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">2. Operations Queue</h2>
            </div>
            
            <p className="text-slate-600 mb-6">
              You must add tasks (reads/writes) to the queue to see the system react.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="flex p-4 border border-slate-100 rounded-lg gap-4 bg-slate-50/50 items-center">
                <Plus className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Add Operation</h4>
                  <p className="text-xs text-slate-500 mt-1">Select a Core, pick READ or WRITE, type a hex Memory Address (e.g., 0xA1), and click to add to the queue.</p>
                </div>
              </div>
              <div className="flex p-4 border border-slate-100 rounded-lg gap-4 bg-slate-50/50 items-center">
                <Trash2 className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Delete Operation</h4>
                  <p className="text-xs text-slate-500 mt-1">Click the trash icon next to any queued operation to remove it before execution.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <div className="flex-1 min-w-[200px]">
                <strong className="text-indigo-900 block text-sm">Executing the Queue</strong>
                <p className="text-xs text-indigo-700 mt-1">
                  Use <strong>"Step Next"</strong> to execute operations one by one and watch the animation slowly. Use <strong>"Run All"</strong> to blast through the entire queue instantly.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Output Visualizations */}
          <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-rose-600" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">3. Understanding the Visuals</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <Cpu className="w-6 h-6 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">The Cores & Bus (Center)</h3>
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                    The large diagram in the center represents your CPUs and their L1 caches sitting on a shared data bus. Keep an eye on the <strong>State Badges (M, S, I, E)</strong>. When an operation runs, watch the animated dots—they represent data (blue and green dots represent hits/misses) or invalidation signals (red dots) traveling across the bus.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Database className="w-6 h-6 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">Main Memory (Bottom Center)</h3>
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                    Shows the definitive source of truth in RAM. If a cache writes data, it might not immediately reflect here unless a "Write-Back" event occurs. Check the memory blocks after operations.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Activity className="w-6 h-6 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">Metrics & Logs (Right Panel)</h3>
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                    Every operation is recorded. The logs tell you if it was a <strong className="text-emerald-600">Hit</strong> or <strong className="text-rose-600">Miss</strong>, how many nanoseconds the operation took, and exactly what bus transactions fired (like <code className="bg-slate-100 px-1 rounded text-xs text-rose-600 text-mono">BusRdX</code>). Real-time metrics highlight the efficiency of your cache.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tips block */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-xl shadow-indigo-200">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5" /> Pro Tip: Load Presets!
            </h3>
            <p className="text-indigo-100 leading-relaxed mb-6">
              Not sure what operations to run to see interesting cache behavior? Use the <strong>"Load Scenario"</strong> button on the bottom left. We have pre-built scenarios like "False Sharing", "Producer-Consumer", and "Sequential Read" that automatically queue up interesting state changes.
            </p>
            <div className="flex gap-4">
              <Link to="/learn" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-lg font-bold text-sm tracking-wide hover:shadow-lg hover:-translate-y-0.5 transition-all">
                Learn Concepts in Depth
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Guide;
