# Anagram Lab — Technical & User Documentation

Welcome to **Anagram Lab**, a web-based computational wordplay suite, letter parity inspector, and dynamic typography animation studio.

---

## 📑 Documentation Index

- **[PRODUCT.md](./PRODUCT.md)** — Product specifications, functional capabilities, target audiences, and core principles.
- **[DESIGN.md](./DESIGN.md)** — Precision Darkroom design system, typography tokens, color palette, and layout guidelines.

---

## 🚀 Core Modules & Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                              ANAGRAM LAB                               │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. Exact Anagram Solver           │ 2. Interactive Rack & Verifier     │
│    • Trie-backed backtracking     │    • Live letter tile manipulation │
│    • Multi-word combinations      │    • Character parity verification │
│    • Heuristic phrase scoring     │    • Missing letters autocomplete  │
├───────────────────────────────────┼────────────────────────────────────┤
│ 3. Dictionary Sub-Words           │ 4. Motion Letter Animator          │
│    • Full lexicon discovery       │    • Multi-trajectory physics      │
│    • Length & alphabetical sort   │    • Frame scrubber timeline       │
│    • Instant tile transfer        │    • Animated GIF & WebM export    │
└───────────────────────────────────┴────────────────────────────────────┘
```

### 1. Multi-Word Exact Anagram Solver
- **Deterministic Backtracking**: Exhaustively searches the dictionary to construct multi-word anagrams with zero character omissions or additions.
- **Heuristic Ranking**: Rates combinations by readability, word length balance, and semantic appeal.
- **Direct Integrations**: Send any discovered phrase straight to the Motion Letter Animator or the Interactive Rack with one click.

### 2. Interactive Letter Rack & Verifier
- **Tactile Tile Board**: Arrange, type, space, or return individual letter tiles in real time.
- **Live Multiset Inspector**: Compares character frequency multisets between source and candidate phrases with instant exactness confirmation.
- **Smart Discrepancy Breakdown**: Highlights missing vs. surplus characters and offers valid single-word completions that exhaust remaining tiles.

### 3. Dictionary Sub-Words Browser
- **Lexicon Explorer**: Inspect every valid English dictionary word constructible using the source letters.
- **Dynamic Filtering**: Filter by exact word length, search substring patterns, and sort alphabetically or by word length.

### 4. Motion Letter Animator & Export Studio
- **Trajectory Flight Paths**: 6 distinct trajectory modes including Flying Arcs, Orbit & Settle, Direct Vector, Scatter, Vortex, and Elastic Bounce.
- **Theme & Typography Selection**: 8 visual color themes and 5 typography styles (Monospace, Geometric Sans, Classical Serif, Cyber Hacker, Pixel).
- **Export Capabilities**: Render and export animated GIFs, record WebM video clips, or copy high-resolution PNG snapshot frames directly to clipboard.

---

## 📂 Project Structure

```
├── index.html                  # HTML entry point with metadata
├── metadata.json               # Application capabilities and configuration
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler configuration
├── vite.config.ts              # Vite bundler configuration
│
├── DESIGN.md                   # Visual styling and design system specs
├── PRODUCT.md                  # Product specifications and capabilities
├── README.md                   # This documentation hub
│
└── src/
    ├── main.tsx                # React application bootstrapper
    ├── App.tsx                 # Root layout and workspace navigation
    ├── index.css               # Global Tailwind CSS imports
    │
    ├── components/
    │   ├── SolverSection.tsx       # Tabbed workspace (Solver, Rack, Sub-Words)
    │   ├── UnifiedRackVerifier.tsx # Tactile tile board & parity verifier
    │   ├── AnagramResultCard.tsx   # Individual solution phrase card
    │   ├── SubWordsExplorer.tsx    # Dictionary sub-words grid and filters
    │   ├── AnimationStudio.tsx     # Canvas animation viewport & export controls
    │   └── ToastContainer.tsx      # Global micro-interaction toast notifications
    │
    ├── types/
    │   └── index.ts            # Shared TypeScript interfaces and type unions
    │
    └── utils/
        ├── anagramSolver.ts    # Trie structure, multiset math, and backtracking
        ├── canvasRenderer.ts   # HTML5 Canvas vector math and flight physics
        ├── gifExporter.ts      # Client-side GIF generation and encoding
        └── toast.ts            # Event-driven toast notification manager
```

---

## 🛠️ Technology Stack

- **Framework**: React 18+ with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS with custom Precision Darkroom color palette
- **Graphics**: Native HTML5 Canvas 2D API for 60fps vector typography motion
- **Icons**: Lucide React

---

## 💻 Development & Build Scripts

```bash
# Start local development server
npm run dev

# Run TypeScript type checker & linter
npm run lint

# Build production static bundle in /dist
npm run build
```
