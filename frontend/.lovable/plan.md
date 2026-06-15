## Sentinel AI — Enterprise Command Center Upgrade

Massive enhancement pass across all 9 existing pages, preserving architecture/branding/dark identity while elevating to Honeywell Forge / Palantir Gotham / Avigilon-grade realism.

### Scope & Approach

Rather than rewrite every file from scratch, I'll layer in depth through:
- **Shared infrastructure** — new live-data engine, AI telemetry simulation, operational state machine
- **Topbar upgrade** — plant identity, shift, env conditions, AI throughput, operators online, scrolling critical-event ticker
- **Per-page deep upgrades** — each page gets the specific subsystems listed
- **Two new global features** — AI Copilot floating panel + Operational Health Center route

### Phase 1 — Foundation (shared)
1. Extend `src/lib/data.ts` with realistic industrial datasets: steel-plant zones (Blast Furnace, Rolling Mill, Scrap Yard, BOF Shop, Casting Bay, Loading Dock, Coke Oven, etc.), incident archetypes with AI reasoning text, operators, AI nodes, GPU metrics, escalation chains, audit log entries.
2. Extend `src/lib/store.ts` with: AI node health, GPU/latency/FPS streams, operator presence, escalation queue, system diagnostics, copilot open state.
3. Upgrade `src/hooks/useLiveSimulation.ts` to drive: streaming events, AI telemetry drift, occupancy changes, camera FPS jitter, environmental sensors.
4. Add `src/components/ai/AICopilot.tsx` — floating drawer assistant available app-wide.
5. Add ambient-motion CSS utilities in `src/styles.css` (scan lines, signal-pulse, ticker, data-shimmer, status-glow).

### Phase 2 — Topbar / Shell
- Plant name + sector code, current shift indicator with progress
- Live ops clock (IST), ambient env (temp/humidity/wind from "plant sensors")
- AI throughput meter, cameras online, operators online
- Horizontally scrolling critical-event ribbon with severity-coded pulses
- Floating AI Copilot trigger

### Phase 3 — Dashboard (Command Center)
Restructure into: (1) Plant operational map header with live zone tiles + risk heat, (2) Live incident stream with thumbnails/AI confidence/escalation, (3) Shift intelligence panel (fatigue, supervisor, forecast), (4) Executive KPI strip, (5) AI infrastructure mini-panel (GPU, latency, FPS, model versions, drift).

### Phase 4 — Live Monitor
- Realistic CCTV simulation: per-camera CSS-rendered "scene" (gradients + noise + scan-line + timestamps + cam ID + FPS counter) representing rolling mill, blast furnace, etc.
- Advanced overlays: object IDs, tracking trails (SVG paths), restricted polygons, proximity rings, pose stick figures, velocity vectors, confidence labels
- Controls: AI layer toggles, heatmap mode, attention mode (auto-focus on highest-severity cam), multi-cam sync, snapshot, PTZ sim, playback scrubber

### Phase 5 — Alert Center
- Workflow state machine: NEW → ACK → INVESTIGATING → ESCALATED → RESOLVED / FALSE POSITIVE / CLOSED with transitions
- Deep incident drawer: snapshot strip, event timeline, AI reasoning narrative, related incidents, operator notes, escalation chain visualization, evidence export
- AI Correlation panel: clusters, pattern detection ("5 PPE violations in Blast Furnace within 20 min")

### Phase 6 — PPE Compliance
- Department-level grid, worker recurring-offender list, predictive deterioration curve, AI recommendations cards, animated compliance rings, equipment-specific violation breakdown

### Phase 7 — Zone Control
- Industrial blueprint SVG floor plan (grid background, dimensions, hatch patterns for restricted, camera coverage cones, worker dot animations along paths), live occupancy counters per zone, evacuation route overlay toggle

### Phase 8 — Analytics
- Predictive risk engine (forecast curves with confidence bands), AI insight cards, executive KPI grid, correlation heatmap, layered trend graphs

### Phase 9 — Investigations
- Frame-by-frame scrubber with AI event markers on timeline, multi-camera sync row, evidence tag system, object tracking history table, annotation tool

### Phase 10 — Reports
- Report preview cards rendering mini executive PDF layouts (cover, KPI page, charts), template library (OSHA, ISO 45001, internal audit), schedule manager, delivery workflow status

### Phase 11 — Settings
- Tabbed: Cameras (RTSP pipeline diagnostic, bandwidth/storage/firmware), AI Config (model deploy table, drift, GPU allocation, edge nodes), Users (roles matrix), Notifications (escalation routing builder)

### Phase 12 — New: Operational Health Center
- New route `/health` with: AI node grid (GPU%, temp, inference qps), camera network topology, storage gauges, latency histograms, deployment status, edge sync

### Technical Notes
- All values driven by store + interval ticks, no hardcoded random per-render
- Pure CSS/SVG for "video" — no external image deps
- Recharts for advanced charts (with confidence bands via Area + line composition)
- Framer-motion-style transitions via CSS keyframes already present + a few new utility classes
- Performance: simulation tick batches state updates; heavy lists virtualize via slice windows

### Out of scope
- Real RTSP / actual ML inference (all simulated)
- Backend persistence (Lovable Cloud not enabled — keeping client-side as before)
- Authentication (not present in current build)

This is a large multi-file pass (~15-20 files touched/created). I'll execute it sequentially in focused batches and verify the build after each major phase.