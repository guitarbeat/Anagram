# Revised Implementation Plan: Natural & Deliberate UI (Zero Counter Noise)

Strip away arbitrary status counters, metric badges, and numerical clutter across the app to create a natural, deliberate, and organic experience focused on words, candidate exploration, and clear layout flow.

---

## Key Streamlining Changes

### 1. Remove Arbitrary Status Counters
- Eliminate numerical status counters, word count pills, and metric badges from the dock and view surfaces.
- Focus purely on clear, deliberate action controls:
  - **View Track**: `PEBBLES`, `GRAPH`, `BLOCKS`, `STATS`
  - **Filter Toggle**: `FILTERS` (drawer toggle)
  - **Sort Order**: `SORT` (clean dropdown with directional icon)

### 2. Natural & Organic Histogram View (`ContextualLens.tsx`)
- Remove counter badges (`3679 WINS`, `1414 words`) from the Histogram and Lens view headers.
- Render clean, unboxed bar charts with natural interactive hover and tap states.
- Keep the side rail ultra-minimal with essential mode buttons (`STATS`, `SPLIT`, `SOLVE`) without numerical badge bubbles.

### 3. Deliberate Candidate Word Pebbles (`CandidateWordsList.tsx`)
- Present candidate word pebbles as clean, tactile tiles.
- Remove counter chips or floating score tags, making word selection intuitive and focused on word play.

---

## Verification Plan

### Automated Verification
- Run `lint_applet` to ensure clean TypeScript compilation.
- Run `compile_applet` to verify applet build.

### Manual Verification
- Navigate through all views (**PEBBLES**, **GRAPH**, **BLOCKS**, **STATS**) and confirm that arbitrary status counters and pill badges have been removed.
- Verify that the bottom dock and Histogram view feel quiet, deliberate, and natural.
