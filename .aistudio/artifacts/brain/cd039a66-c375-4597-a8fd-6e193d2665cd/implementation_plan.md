# Workspace Streamlining: Stage Header Composer & Collapsible Dock

Streamline Anagram Lab's workspace layout by integrating the target phrase builder directly into the Stage header with tactile inline word chips (1-click removal and drag ordering) while converting the middle composer row into a minimized, collapsible dock within the 3-pane split architecture.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following design choices were confirmed in Phase 1:
> - **Stage Header Integration**: Target phrase composition is cleanly represented within the Kinetic Stage top container, allowing users to preview animations and letter flight paths in direct visual continuity with the active sentence.
> - **Inline Interactive Word Chips**: Words in the target sentence render as tactile chips with 1-click removal (`×`) and drag-and-drop / swap ordering, eliminating cumbersome text-selection gymnastics.
> - **3-Pane Split with Minimized Collapsible Composer Dock**: The middle row transitions into a sleek, minimized collapsible dock (`56px` expanded, compacting down to `28px` or collapsing seamlessly) so the viewport feels airy and spacious like a 2-pane split while keeping quick-input capabilities 1 tap away.

---

### 1. Overview & Core Concept

- **What It Delivers**: Unifies sentence composition and kinetic animation by displaying the evolving phrase directly alongside the animated canvas, while turning the secondary input row into an unobtrusive collapsible dock.
- **Target Experience**: Seamless word discovery where tapping words in the Word Explorer immediately populates the sentence chips in the Stage header, with immediate animation playback and parity feedback.
- **Key Value**: Reclaims vertical screen real estate, eliminates visual redundancy between the composer and canvas, and prevents awkward scrolling on smaller desktop and mobile viewports.

---

### 2. User Experience & Visual Design

#### Interaction & Layout Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP PANE: Kinetic Stage + Integrated Header Composer                   │
│   • Top Bar: Source Name ─── [Editable Sentence Chips ×] ─── Status   │
│   • Canvas: 60fps Kinetic Flight Trajectories                          │
├────────────────────────────────────────────────────────────────────────┤
│ DIVIDER 1: Stage Controls (Play/Rewind/Scrubber) · Grab Notch · Presets│
├────────────────────────────────────────────────────────────────────────┤
│ MIDDLE PANE: Minimized Collapsible Composer Dock                       │
│   • Compact single-line input pill with expand/collapse chevron        │
├────────────────────────────────────────────────────────────────────────┤
│ DIVIDER 2: Lexicon Controls (Filters/Mode) · Grab Notch · Layout View  │
├────────────────────────────────────────────────────────────────────────┤
│ BOTTOM PANE: Word Explorer (Graph / Blocks / Pebbles / Stats)          │
└────────────────────────────────────────────────────────────────────────┘
```

#### Visual Tokens & Component Styling

1. **Integrated Stage Header Composer**:
   - Clean obsidian bar (`bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.08] px-3 py-1.5 flex items-center justify-between gap-3`).
   - Left: Source Name label.
   - Center: Interactive sentence chip bank:
     - Each word rendered as an individual chip: `bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 text-zinc-100 rounded-lg px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95`.
     - 1-click delete button: `text-zinc-500 hover:text-white p-0.5 rounded-full hover:bg-white/10`.
     - Drag handle or swap affordances for instant reordering.
   - Right: Parity status pill (e.g. `100% Solved` in emerald or `2 remaining`).
2. **Minimized Collapsible Composer Dock**:
   - Resting state: Sleek, compact dock ($28\text{px}$–$32\text{px}$) with quick text input and a collapse/expand chevron.
   - Expanded state: Full source & target input card pair with drag-and-drop dropzones.
   - Keyboard awareness: Automatically adapts height when mobile keyboard engages.

---

### 3. Key Product Decisions & Trade-Offs

- **Header Word Chips vs. Raw Text Input**:
  - *Chosen Approach*: Render target words as discrete interactive chips in the header while keeping text editing available in the collapsible dock.
  - *Why*: Eliminates accidental cursor misplacements when clicking words in the explorer, making building anagrams tactile and mistake-proof.
- **Collapsible Middle Dock vs. Complete Removal**:
  - *Chosen Approach*: Retain the middle pane as a collapsible dock rather than removing it completely.
  - *Why*: Satisfies the user's choice for 3-pane topology with a minimized dock, preserving quick manual typing of custom names while keeping the viewport uncluttered.
- **Drag & Swap Word Ordering**:
  - *Chosen Approach*: Support instant word swapping via click or drag-and-drop between adjacent chips, with smooth Framer Motion layout transitions.

---

### 4. Technical Architecture & Component Changes

```
┌────────────────────────────────────────────────────────────────────────┐
│ src/components/NameAnagramStage.tsx                                    │
│  - Add Integrated Header Composer bar above canvas                     │
│  - Render interactive word chips with delete, swap, and add handlers   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────┴────────────────────────────────────┐
│ src/components/TargetHistogramWindow.tsx                               │
│  - Add collapsible dock mode (compact 28px bar with expand chevron)    │
│  - Sync state with Stage header composer                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────┴────────────────────────────────────┐
│ src/components/ThreePaneSplit.tsx & src/App.tsx                        │
│  - Adjust middle pane height allocation (compact 32px vs full 64px)    │
│  - Wire word chip interactions to update targetPhrase state            │
└────────────────────────────────────────────────────────────────────────┘
```

#### Step-by-Step Implementation Sequence

1. **`src/components/NameAnagramStage.tsx`**:
   - Add the `IntegratedHeaderComposer` inside `NameAnagramStage`:
     - Split `targetPhrase` into word tokens.
     - Render word chips with 1-click removal, quick swap, and empty placeholder when blank.
     - Connect to `onTargetPhraseChange` and toast notifications.
2. **`src/components/TargetHistogramWindow.tsx`**:
   - Introduce an `isCollapsed` toggle state with local storage persistence.
   - Render a compact dock bar when collapsed: `Write name · Remix phrase` with quick expand button.
   - Render the full input deck when expanded.
3. **`src/components/ThreePaneSplit.tsx`**:
   - Update `middleHeight` dynamic calculation to support collapsed height ($32\text{px}$) and expanded height ($64\text{px}$).
4. **`src/App.tsx`**:
   - Ensure all word addition and removal handlers trigger smooth animation updates without layout glitches.

---

### 5. Verification Plan

- **Compilation**: Run `compile_applet` and `lint_applet` to verify zero TypeScript errors.
- **Interactive Verification**:
  - Tap candidate words in Word Explorer $\to$ Verify word chips appear immediately in the Stage header.
  - Click the `×` on a word chip $\to$ Verify word is removed and letter tiles rewind.
  - Toggle collapse on the middle composer dock $\to$ Verify it smoothly contracts to 32px and expands on click.
  - Test animation playback $\to$ Verify canvas renders correctly with the new header bar.
