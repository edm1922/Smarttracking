---
target: dashboard
total_score: 20
p0_count: 2
p1_count: 2
timestamp: 2026-06-21T10-44-35Z
slug: frontend-src-app-dashboard-page-tsx
---
## Design Health Score

### Nielsen Heuristics

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | CircularLoading steps are good; no "last refreshed" timestamp |
| 2 | Match System / Real World | 3 | Domain jargon appropriate; "SECTION 01" is artificial scaffolding |
| 3 | User Control and Freedom | 3 | Filters work; no undo; no cancel on long loads |
| 4 | Consistency and Standards | 2 | StockHealthWidget shadows/lift violate DESIGN.md spec |
| 5 | Error Prevention | 2 | Date range not validated; main fetch silently fails |
| 6 | Recognition Rather Than Recall | 3 | Labels clear; chart colors lack accessible legend patterns |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts, no bulk actions, no saved filters |
| 8 | Aesthetic and Minimalist Design | 2 | Decorative pulse animations, section numbering, gradient bar |
| 9 | Error Recovery | 1 | Main API failure logs to console; no user message or retry |
| 10 | Help and Documentation | 0 | No tooltips, no help, no onboarding, no support contact |
| **Total** | | **20/40** | **Acceptable (needs improvement)** |

### Anti-Patterns Verdict

**LLM assessment**: Partially passes AI slop test. Three failures: (1) Banned numbered sections "SECTION 01:" / "SECTION 02:" explicitly violate DESIGN.md; (2) StockHealthWidget uses shadow-xl/lift-hover/pulse animation not in design system; (3) 1800ms forced minimum load feels manipulative. A Linear/Stripe/Notion designer would trust typography/spacing but pause at toy-like card animations and section numbering scaffolding.

**Deterministic scan**: Detector found 8 issues: 3 gray-on-color warnings (text-gray-400 on bg-blue-600 line 936, bg-indigo-600 line 974, bg-red-500 StockHealthWidget:91), 5 undocumented color #94a3b8 advisories (within slate family, minor drift).

### Overall Impression

Solid informational foundation — data well-organized, loading UX transparent, Report Modal genuinely well-crafted. But the page is at war with its design system: StockHealthWidget ignores established component vocabulary, section numbering violates explicit bans, decorative motion undermines "professional restraint." Single biggest opportunity: bring widget in line with design system and fix silent failure on main data fetch.

### What's Working

1. **CircularLoading with step tracking** — transparent, informative, builds trust
2. **Empty states** — every widget handles no-data gracefully with informative messages
3. **Report Modal flow** — progressive disclosure (select type → configure → preview → PDF) is well-designed

### Priority Issues

**P0 — Silent failure on main data fetch**: page.tsx:571 catches error with console.error only; renders broken/empty sections when data is null. Add error UI with retry. Command: /impeccable harden dashboard

**P0 — StockHealthWidget violates design system**: Uses shadow-xl/rounded-[2rem]/hover:-translate-y-1/scale-110/animate-pulse-slow. DESIGN.md says shadow-sm/rounded-3xl/no lift. Replace shadows, remove translate-y, use rounded-3xl. Command: /impeccable polish StockHealthWidget

**P1 — Banned numbered section markers**: "SECTION 01:" / "SECTION 02:" at lines 654/910. Explicitly banned by DESIGN.md. Remove prefix. Command: /impeccable distill dashboard

**P1 — No help/documentation (0/4 on heuristic)**: No tooltips, no help drawer, no onboarding. Jordan persona abandons at jargon. Add contextual tooltips, help icon. Command: /impeccable clarify dashboard

**P2 — Decorative animation at odds with brand**: animate-pulse green dot (no info value), animate-pulse-slow on low-stock icon, duration-1000 progress bars, "Decorative dots" comment in LoadingProgress. Remove pulse dots, reduce to 300ms. Command: /impeccable quieter dashboard

**P2 — Gray text on colored backgrounds**: text-gray-400 on bg-blue-600 (line 936), bg-indigo-600 (974), bg-red-500 (StockHealthWidget:91). Use text-white instead. Command: /impeccable polish dashboard

**P3 — Color-only meaning in pie charts**: Stock distribution uses only green/red hues; department pie uses 5 COLORS with no accessible legend markings. Fails colorblind users. Add segment labels. Command: /impeccable audit dashboard

### Persona Red Flags

**Alex (Power User)**: No keyboard shortcuts, no bulk/batch, forced 1800ms minimum load, no quick-nav to reports

**Sam (Accessibility)**: outline-none without visible focus, hue-only pie charts, no aria-labels, animate-pulse ignores prefers-reduced-motion, 9-10px fonts may fail text resize

**Jordan (First-Timer)**: No clear first action, jargon (PCS/Threshold) without tooltips, section labels mismatch modal categories, "View Reports" ambiguous

### Minor Observations

- COLORS array includes #6366f1 (admin accent) on standard dashboard — violates One-Accent Rule
- Purple icon for "ORGANIZATIONAL" section — third accent color
- StockHealthWidget uses text-emerald-600 — should be primary blue
- "View Report" button uses bg-purple-50 in Section 02, bg-gray-900 in Section 01 — inconsistent
- Low-demand items at opacity-50 but clickable — confusing
- Stock distribution pie has 2 categories but COLORS provides 5 — leftover copy-paste
- #94a3b8 used in tooltip styling but not in DESIGN.md — color drift

### Questions to Consider

1. If the summary bar is the "answer," should it be a persistent global status ribbon instead of a toolbarlike header?
2. When a component violates the design rules it was built from, is the DS too abstract or the implementation undisciplined?
3. Alex has no shortcuts. Sam has no focus. Jordan has no onboarding. Who is the dashboard actually for?
