# Anagram Lab — Product Specification

<!-- uizze:product-schema 1 -->

## 1. Platform & Target Audience

| Dimension | Details |
|---|---|
| **Platform** | Web (Desktop & Mobile Responsive) |
| **Primary Users** | Writers, wordsmiths, puzzle designers, cryptographers, content creators, and typography enthusiasts |
| **Use Cases** | Exact name/phrase anagram discovery, character parity verification, visual video/GIF creation for social sharing, and lexical exploration |

---

## 2. Product Purpose & Positioning

**Anagram Lab** provides high-precision computational wordplay and dynamic typography motion tools in a unified, distraction-free environment.

### Key Differentiators
- **100% Deterministic Multiset Integrity**: Every exact anagram guarantees identical letter counts with zero character loss or addition.
- **Integrated Motion Studio**: Transforms static anagrams into animated vector letter flight paths ready for video and animated GIF export.
- **All-in-One Studio**: Combines a multi-word backtracking search engine, tactile letter-rack sandbox, dictionary explorer, and real-time parity checker into a single streamlined workspace.

---

## 3. Core Capabilities

### 3.1 Multi-Word Anagram Solver
- Deep unabridged dictionary exploration with recursive combinatorial backtracking.
- Heuristic scoring sorting combinations by legibility, word length balance, and phrasing harmony.
- Quick filter and sort options (Best Score, Fewest Words, Most Words, Alphabetical).

### 3.2 Interactive Letter Rack & Parity Verifier
- Visual letter tile bank with click-to-place and physical keyboard input.
- Real-time character multiset diff engine calculating exact matches, missing characters, and surplus letters.
- Predictive completion chips suggesting valid words that exhaust remaining unplaced tiles.

### 3.3 Dictionary Sub-Words Browser
- Exhaustive listing of all valid single words constructible from the source text.
- Word length selector, substring search, and alphabetical/length sorting.
- One-click transfer to add words directly into the interactive letter rack.

### 3.4 Motion Letter Animator
- HTML5 Canvas rendering engine with 6 distinct physics models:
  - *Flying Arcs*: Curved parabolic flight trajectories.
  - *Orbit & Settle*: Gravitational spiral motion.
  - *Direct*: Straight linear interpolation.
  - *Scatter / Explosion*: Outward dispersal and snap-in convergence.
  - *Vortex*: Swirling vortex rotation.
  - *Elastic Bounce*: Spring-damped trajectory overshoot.
- 8 curated color themes (Standard Dark, Clean Light, Neon Blue, Cyberpunk, Parchment, Retro 80s, Emerald, Sunset).
- 5 typography choices (Monospace, Geometric Sans, Classical Serif, Cyber Hacker, Pixel).
- Timeline scrubber with play/pause, step backward/forward, and loop configurations.
- Direct export to Animated GIF, WebM video recording, and instant PNG frame clipboard copying.

---

## 4. Product Principles

1. **Multiset Truth is Inviolate**: An anagram is considered exact if and only if character multisets match 100%. No silent approximations or character loss.
2. **Tactile & Fluid Feedback**: Every tile manipulation, search filter, and animation parameter updates instantaneously with zero layout thrashing.
3. **Streamlined Workflow**: Zero unnecessary modals or nested pages; all tools are accessible within a single continuous workspace with sticky navigation.
4. **Accessible Contrast**: Strict adherence to WCAG AA contrast standards using high-legibility zinc and emerald telemetry on obsidian backdrops.
