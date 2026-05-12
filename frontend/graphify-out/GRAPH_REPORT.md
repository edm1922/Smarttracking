# Graph Report - frontend  (2026-05-13)

## Corpus Check
- 60 files · ~73,617 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 181 nodes · 215 edges · 28 communities (21 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21529753`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `useDebounce()` - 9 edges
2. `TableSkeleton()` - 8 edges
3. `CardSkeleton()` - 7 edges
4. `PageHeaderSkeleton()` - 7 edges
5. `ErrorBoundary` - 6 edges
6. `useLoadingSteps()` - 6 edges
7. `generatePayslipPDF()` - 4 edges
8. `UnitTrackingPage()` - 3 edges
9. `LoadingProgress()` - 3 edges
10. `formatDate()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `DashboardPage()` --calls--> `useLoadingSteps()`  [EXTRACTED]
  src/app/dashboard/page.tsx → src/components/ui/LoadingProgress.tsx
- `QRLogsPage()` --calls--> `useDebounce()`  [EXTRACTED]
  src/app/dashboard/logs/page.tsx → src/hooks/useDebounce.ts
- `ProductsPage()` --calls--> `useDebounce()`  [EXTRACTED]
  src/app/dashboard/products/page.tsx → src/hooks/useDebounce.ts
- `RequestsPage()` --calls--> `useDebounce()`  [EXTRACTED]
  src/app/dashboard/products/requests/page.tsx → src/hooks/useDebounce.ts
- `UnitTrackingPage()` --calls--> `useLoadingSteps()`  [EXTRACTED]
  src/app/dashboard/unit-tracking/page.tsx → src/components/ui/LoadingProgress.tsx

## Communities (28 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (8): CustomField, Item, api, Location, Product, TransmittalItem, UnitTrackingData, TransmittalItem

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (12): Request, Location, Product, ProductStock, SelectedItem, Batch, CustomField, Item (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (13): useDebounce(), LogEntry, QRLogsPage(), Location, Product, ProductsPage(), DraftItem, Location (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (11): COLORS, DashboardPage(), CircularLoading(), CircularLoadingProps, LoadingProgress(), LoadingProgressProps, LoadingStep, useLoadingSteps() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (5): ErrorBoundary, Props, State, BatchRow, EmployeeCard

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (4): EmployeeDashboard(), formatAmount(), formatDate(), generatePayslipPDF()

### Community 6 - "Community 6"
Cohesion: 0.4
Nodes (3): geistMono, geistSans, metadata

### Community 8 - "Community 8"
Cohesion: 0.4
Nodes (3): Batch, Item, QueuedItem

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **51 isolated node(s):** `eslintConfig`, `nextConfig`, `config`, `geistSans`, `geistMono` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TableSkeleton()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `CardSkeleton()` connect `Community 1` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `config` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._