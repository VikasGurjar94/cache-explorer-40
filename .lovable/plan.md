

## Cache Coherency Protocol Simulator

### Overview
A minimal, interactive web simulator for cache coherency protocols (MSI, MESI, MOESI) in multi-core systems. Clean table-based UI with step-by-step execution and logging.

### Architecture

**Core Engine** (pure TypeScript, UI-independent):
- Cache model: per-core cache with address/value/state/dirty-bit
- Shared memory model (key-value store)
- Protocol engines for MSI, MESI, and MOESI with correct state transition logic
- Bus transaction system (BusRd, BusRdX, BusUpgr, Flush)
- Step queue that processes one operation at a time, returning detailed transition info

**UI Layer** (single-page, no routing needed):

1. **Top Bar** — Protocol selector (MSI / MESI / MOESI), core count selector (2–4), Reset button
2. **Operation Input** — Dropdowns for core + operation (READ/WRITE) + address + value (for writes), "Add" button to queue operations, "Next Step" button to execute
3. **Main Grid (left ~60%):**
   - Cache tables per core showing Address | Value | State (color-coded: M=red, E=green, S=blue, I=grey, O=orange)
   - Main memory table showing Address | Value
4. **Logs Panel (right ~40%):** — Scrollable log of every step with operation, bus actions, and state changes
5. **Operation Queue** — Shows pending operations

### Key Implementation Details
- All protocol logic lives in standalone classes/functions under `src/lib/simulator/`
- State transitions follow standard textbook definitions for each protocol
- Each "Next Step" processes one operation: detects hit/miss, issues bus transactions, updates all caches, logs everything
- No backend needed — everything runs client-side

### File Structure
- `src/lib/simulator/types.ts` — CacheState, Operation, BusTransaction types
- `src/lib/simulator/cache.ts` — Cache and Memory models
- `src/lib/simulator/protocols/msi.ts` — MSI protocol engine
- `src/lib/simulator/protocols/mesi.ts` — MESI protocol engine  
- `src/lib/simulator/protocols/moesi.ts` — MOESI protocol engine
- `src/lib/simulator/engine.ts` — Main simulation engine orchestrating everything
- `src/pages/Index.tsx` — Single-page simulator UI
- `src/components/CacheTable.tsx` — Per-core cache display
- `src/components/MemoryView.tsx` — Main memory display
- `src/components/LogPanel.tsx` — Step logs
- `src/components/OperationInput.tsx` — Operation input controls
- `src/components/SimulatorControls.tsx` — Protocol/core selection, reset

