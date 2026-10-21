# Graph Report - agents-on-open-rails  (2026-10-20)

## Corpus Check
- Corpus is ~4,675 words - fits in a single context window. You may not need a graph.

## Summary
- 147 nodes · 181 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.74)
- Token cost: 1,500 input · 1,200 output

## Community Hubs (Navigation)
- Next.js UI & Agent Views
- Build & Lint Tooling
- TypeScript Configuration
- Agent Specs & Architecture
- Web Framework & Providers
- ERC-8004 Agent Registration
- Textile FX Oracle & Quotes
- Package Dev Dependencies
- Core Runtime Dependencies
- Agent Budget Management
- Obsidian API Bridge
- Obsidian Context Hooks

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `Tesoreria JIT` - 8 edges
3. `Home()` - 7 edges
4. `Web Frontend (Next.js 16)` - 7 edges
5. `wagmi` - 6 edges
6. `scripts` - 5 edges
7. `viem` - 5 edges
8. `BudgetSettings()` - 5 edges
9. `Balances()` - 4 edges
10. `ConnectButton()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `file.svg Asset` --references--> `Web Frontend (Next.js 16)`  [INFERRED]
  web/public/file.svg → web/README.md
- `globe.svg Asset` --references--> `Web Frontend (Next.js 16)`  [INFERRED]
  web/public/globe.svg → web/README.md
- `next.svg Asset` --references--> `Web Frontend (Next.js 16)`  [INFERRED]
  web/public/next.svg → web/README.md
- `vercel.svg Asset` --references--> `Web Frontend (Next.js 16)`  [INFERRED]
  web/public/vercel.svg → web/README.md
- `window.svg Asset` --references--> `Web Frontend (Next.js 16)`  [INFERRED]
  web/public/window.svg → web/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **JIT Treasury Core Financial Flow** — readme_ripio_ramp, readme_textile_fx, readme_x402_micropayments, readme_tesoreria_jit [EXTRACTED 0.95]

## Communities (12 total, 2 thin omitted)

### Community 0 - "Next.js UI & Agent Views"
Cohesion: 0.15
Nodes (17): Home(), STEPS, AgentActivity(), Balances(), formatAmount(), tokenList, ConnectButton(), shortAddress() (+9 more)

### Community 1 - "Build & Lint Tooling"
Cohesion: 0.11
Nodes (18): eslint, eslint-config-next, react-dom, tailwindcss, @tailwindcss/turbopack, @types/node, @types/react, @types/react-dom (+10 more)

### Community 2 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 3 - "Agent Specs & Architecture"
Cohesion: 0.12
Nodes (15): Obsidian Docs Skill, Celo Mainnet (42220), ERC-8004 Agent Identity, ERC-8021 Attribution Tags, Ripio On-Ramp (wARS), Tesoreria JIT, Textile FX Protection, x402 Pay-per-use APIs (+7 more)

### Community 4 - "Web Framework & Providers"
Cohesion: 0.15
Nodes (12): next, @tanstack/react-query, wagmi, nextConfig, geistMono, geistSans, metadata, RootLayout() (+4 more)

### Community 5 - "ERC-8004 Agent Registration"
Cohesion: 0.17
Nodes (8): @celo/attribution-tags, abi, data, minted, pub, send, suffix, wallet

### Community 6 - "Textile FX Oracle & Quotes"
Cohesion: 0.25
Nodes (6): viem, amounts, fmt(), preview(), USDT, wARS

### Community 7 - "Package Dev Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @types/node, @types/react, @types/react-dom (+1 more)

### Community 8 - "Core Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, @celo/attribution-tags, next, react, react-dom, @tanstack/react-query, viem, wagmi

### Community 9 - "Agent Budget Management"
Cohesion: 0.33
Nodes (5): react, Budget, BudgetSettings(), DEFAULT_BUDGET, loadBudget()

## Knowledge Gaps
- **17 isolated node(s):** `react-dom`, `@tailwindcss/turbopack`, `@types/node`, `@types/react`, `@types/react-dom` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 92 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `viem` connect `Textile FX Oracle & Quotes` to `Next.js UI & Agent Views`, `Build & Lint Tooling`, `ERC-8004 Agent Registration`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **What connects `react-dom`, `@tailwindcss/turbopack`, `@types/node` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Build & Lint Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `wagmi` connect `Web Framework & Providers` to `Next.js UI & Agent Views`, `Build & Lint Tooling`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `TypeScript Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Package Dev Dependencies` to `Build & Lint Tooling`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `Agent Specs & Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._