---
name: Anagram Lab Precision Darkroom
description: A tactile, high-density scientific darkroom studio design system tailored for computational wordplay, typography motion, and combinatorial mechanics.
colors:
  primary: "#f4f4f5"
  secondary: "#a1a1aa"
  tertiary: "#38bdf8"
  neutral: "#09090b"
  surface: "#18181b"
  border: "#27272a"
  borderHighlight: "#3f3f46"
  accentSuccess: "#10b981"
  accentWarning: "#f59e0b"
  accentDanger: "#ef4444"
typography:
  fontFamily:
    display: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    body: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"
  fontSize:
    xs: "11px"
    sm: "12px"
    base: "14px"
    lg: "16px"
    xl: "20px"
    "2xl": "24px"
    "3xl": "30px"
  fontWeight:
    normal: 400
    medium: 500
    semibold: 600
    bold: 700
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  unit: "4px"
  tight: "6px"
  base: "12px"
  card: "16px"
  section: "24px"
---

# Design System: Precision Darkroom

**Creative North Star: The Mechanical Typesetter's Laboratory**

Anagram Lab is constructed around a high-density, scientific darkroom studio aesthetic. Letters are treated not as plain text strings, but as physical tiles with mass, frequency, and flight trajectories.

---

## 1. Color Palette & Functional Roles

| Token | Hex Value | Tailwind Class | Semantic Usage |
|---|---|---|---|
| **Canvas Base** | `#09090b` | `bg-zinc-950` / `#09090b` | Global background canvas & viewport bezels |
| **Surface Panel** | `#18181b` | `bg-zinc-900/60` | Instrument cards, tab panels, and control decks |
| **Input / Inset** | `#09090b` | `bg-zinc-950` | Embedded text inputs, tile rack bays, and dropzones |
| **Structural Border** | `#27272a` | `border-zinc-800` | 1px hairline dividers and container boundaries |
| **Hover Border** | `#3f3f46` | `border-zinc-700` | Interactive card and button focus/hover outlines |
| **Primary Text** | `#f4f4f5` | `text-zinc-100` | High-contrast headers, active titles, and tile glyphs |
| **Muted Text** | `#a1a1aa` | `text-zinc-400` | Field labels, descriptive copy, and inactive state |
| **Telemetry Mono** | `#71717a` | `text-zinc-500` | Character counters, letter indices, and timestamps |
| **Exact Emerald** | `#10b981` | `text-emerald-400` | 100% exact anagram verification badges |
| **Discrepancy Amber** | `#f59e0b` | `text-amber-400` | Missing letter tags, partial progress bars |
| **Surplus Rose** | `#ef4444` | `text-rose-400` | Surplus/invalid character indicators |

---

## 2. Typographic Scale & Rules

```
Level             Font Family       Size        Weight    Tracking
────────────────────────────────────────────────────────────────────
Heading 1         System Sans       20px (xl)   600 (sb)  tight (-0.02em)
Heading 2         System Sans       16px (base) 600 (sb)  tight (-0.01em)
Body Copy         System Sans       13-14px     400-500   normal
Letter Glyphs     Monospace         14-16px     700 (b)   normal
Telemetry Chips   Monospace         10-11px     500 (m)   wide (+0.03em)
```

### Key Typographic Rules
1. **Monospace Letter Alignment**: All tile glyphs, multiset arithmetic (`×2`), and character counts use tabular monospace fonts (`ui-monospace`, `Menlo`) to prevent layout shifting during real-time typing.
2. **Compact Labels**: Field labels use uppercase or sentence case in `text-xs font-semibold text-zinc-400` with comfortable line height (`1.5`).

---

## 3. Spatial System & Layout Hierarchy

- **Main Container**: Centered column constrained to `max-w-5xl` (1024px) with responsive horizontal padding (`px-4 sm:px-6`).
- **Section Rhythm**: Generous `space-y-6` to `space-y-8` rhythm with subtle 1px dividers (`border-zinc-800/80`).
- **Control Decks**: Responsive grid layouts (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) for physics, theme, and font selectors to maintain single-view ergonomics.

---

## 4. Component Design Patterns

### 4.1 Interactive Letter Tile
- **Bank Tile (Unplaced)**: `w-8 h-10 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded font-mono font-bold text-sm shadow-xs hover:bg-zinc-800 active:scale-90`.
- **Bank Tile (Placed)**: `opacity-20 bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed`.
- **Rack Tile (Arranged)**: `w-8 h-10 bg-zinc-100 text-zinc-950 font-mono font-bold text-sm rounded shadow-xs hover:bg-white active:scale-90`.

### 4.2 Solution Result Card
- Compact card with primary solution text, word token badges, one-click "Animate in Studio" trigger, "Rack" transfer button, and copy action.

### 4.3 Motion Canvas Viewport
- Dark inset screen with 60fps HTML5 Canvas rendering, integrated scrubber timeline, loop mode selector, and export controls.

### 4.4 Analytical Data Cards & Clean Enclosures
- **Zero-Header Philosophy**: Data cards (such as Part of Speech bubbles and Word Length treemaps) omit redundant static header bars and title strips (`Word Lengths`, `Part of Speech`). The visualization canvas runs edge-to-edge inside the card bezel to maximize 100% of available vertical and horizontal space.
- **Squarified Treemaps over Histograms**: Frequency and length distributions employ responsive squarified treemaps instead of column histograms. Traditional histograms leave empty headroom and squish columns in tall/narrow responsive panels; squarified treemaps tile 100% of available area with balanced aspect ratios.
- **Self-Reversing Direct Toggles (No "Clear Filter" Buttons)**: Never overlay floating or static "Clear Filter" buttons or reset badges onto the visualization. Clicking any active tile or segment toggles it off. If all active segments are toggled off, the filter clears automatically. Clicking multiple segments seamlessly adds or removes them from a compound filter. Double-clicking the container background acts as an optional gesture to reset all filters at once without cluttering the canvas.
- **Parallel (Concentric) Corners**: When nesting rounded content boxes or treemap tiles within rounded enclosures, inner corner radii must be strictly concentric ($R_{inner} = R_{outer\_inner\_surface} - \text{gap}$). The outer card has $R_{outer} = 22px$ with a $2px$ border, yielding an inner-edge radius of $20px$ (sm) / $16px$ (mobile). With uniform $6px$ perimeter padding, the perimeter-facing corners of corner tiles are set to $14px$ (`sm:rounded-tl-[14px]`) / $10px$ (`rounded-tl-[10px]`). This eliminates corner bulging or pinching, guaranteeing a mathematically uniform $6.0px$ parallel curve at all angles. Interior corners adjacent to other tiles maintain a tight $5px$–$6px$ radius.

### 4.5 Fluid Split Screen, Snap Points & Idle Peek Architecture
- **Continuous Fluid Snapping with Velocity Damping**: Inspired by native gesture split-screen sheets (Amie / `VerticalSplit`), dragging a divider tracks pointer velocity. Quick flicks (high velocity) automatically snap panels to their target states (e.g. flick up to minimize stage or expand words; flick down to minimize words or expand stage).
- **First-Class `SplitDetent` Type & Algebraic States**: Directly ported from `SplitDetent.swift`:
  - `topFull`: Top view fills the entire viewport; bottom view collapses into an edge minimal pill with one-tap restore.
  - `bottomFull`: Bottom view fills the entire viewport; top view collapses into an edge minimal pill with one-tap restore.
  - `topMini`: Top view collapses into its compact Idle Peek state (sleek 34px dock refined from `m0ahs` fork) while bottom view occupies primary focus.
  - `bottomMini`: Bottom view collapses into its compact Idle Peek state (sleek 34px dock refined from `m0ahs` fork) while top view occupies primary focus.
  - `fraction(value)`: Proportional harmonic split ratio with 15% preview threshold (`fraction(0.15)` from `m0ahs` fork) preventing abrupt total collapse, snapped across 6 discrete notches: `0.15`, `0.32`, `0.48`, `0.64`, `0.76`.
- **Tactile Spring Dynamics & Haptic Tuning**: Directly ported from `benhernes` (`VerticalSplitBen` fork):
  - *Spring Physics*: Custom spring curve matching `.spring(response: 0.3, dampingFraction: 0.7)` (`cubic-bezier(0.2, 0.9, 0.3, 1)`) for immediate physical snap response without sluggish linear delay.
  - *Vibration Haptics*: Tuned tactile intensities calling `navigator.vibrate` on touch/mobile devices (`heavyImpact` on overscroll boundaries, `rigidImpact` on harmonic detent crossings).
- **Precision Indicator Line & Blur Tuning**: Directly ported from `m0ahs` fork:
  - *Precision 40×2px Line*: Replaced bulky rounded pill bar with a modern, high-precision geometric drag line (`w-10 sm:w-12 h-[2px] bg-white/50 group-hover:bg-white/90`) that scales down (`scale-90`) on active drag.
  - *Crisp 4px Optical Blur*: Reduced minimization blur from 8px to 4px to maintain depth while eliminating muddy/dull visual artifacts.
- **Composable Modifiers & Accessories Architecture (`leadingAccessories`, `trailingAccessories`, `menuAccessories`)**: Directly ported from `Modifiers.swift` and `Accessories.swift`, superseding all fragmented, ad-hoc button props:
  - *Leading Accessories*: Dedicated buttons placed to the left of the drag handle (e.g. panel minimization/expansion chevron).
  - *Trailing Accessories*: Contextual quick-action buttons placed to the right of the drag handle (e.g. one-click reset/restore when customized).
  - *Menu Accessories*: Rich pop-out capsule actions (icon + label) that bloom smoothly inside the split region when the menu trigger is clicked.
  - *Unified Hit-Testing & Theming*: All accessories share standardized touch targets, active state glow, active-tap scale damping (`active:scale-90`), and keyboard accessibility.
- **Dual-Layer Panel Wrappers (`TopWrapper` & `BottomWrapper`)**: Rather than unmounting components during minimization, cards employ a dual-layer wrapper directly ported from SwiftUI `Wrappers.swift`:
  - *Zero Unmounting*: Both the primary content and mini overlay reside continuously in the DOM, preserving canvas state, scroll positions, and WebGL/Canvas loops.
  - *Asymmetric Scaling Anchors*: `TopWrapper` anchors content to `origin-top`, while `BottomWrapper` anchors content to `origin-bottom`.
  - *Interpolated Minimization Optics*: As minimization occurs ($p \in [1, 0]$):
    - Main content scales by $1 - (1 - p) \times 0.15$ ($1.0 \to 0.85$), softly blurs by $(1 - p) \times 8\text{px}$, and fades opacity to $p$.
    - Mini overlay floats in from $\pm 16 \times p\text{px}$ offset, scales from $1 + p \times 0.15 \to 1.0$, and dissolves blur ($p \times 6\text{px} \to 0$).
  - *Hit-Testing Exclusivity*: Content receives pointer events only when expanded ($p > 0.2$); the overlay receives pointer events exclusively when minimized.
- **Floating Split Capsule with Pop-Out Menu Accessories**: Rather than a bare hairline, the divider houses an elevated floating capsule containing:
  - Tactile grab handle with dynamic hover/drag expansion (`w-10` to `w-20`), laser glow, and active drag scale damping (`scale(isDragging ? 0.9 : 1)`).
  - Leading and trailing accessory buttons.
  - Expandable **Pop-out Menu Capsule** (`menuAccessories`) that blooms open directly in the split region when clicking the slider trigger (`SlidersHorizontal`), offering instant one-click detent switching (`50/50`, `Stage 75%`, `Words 75%`, `Solo`) without navigating to separate controls.
  - **Ambient Backdrop Overlay**: When the menu accessory capsule is opened, an ambient backdrop (`fixed inset-0 bg-black/50 backdrop-blur-[2px]`) smoothly dims background cards, allowing dismissal on any outside tap.
- **Overscroll Push to Fullscreen (`topFull` / `bottomFull`)**: Dragging past extreme boundaries with sustained velocity or high position (`> 82%` or `< 16%`) pushes the active card into full-screen mode, smoothly sliding the opposing view off-screen and docking an edge minimal pill for 1-click restore.
- **Double-Click Gesture Cycling**: Double-clicking the grab handle cycles through `Balanced 50/50` ➔ `Stage Focused 75%` ➔ `Words Focused 75%`.
- **Live "Idle Peek" Component States**: Minimized panels NEVER collapse into dead, static text strips. As a panel collapses, it transitions into a rich, compact Idle Peek bar:
  - *Kinetic Stage Idle*: Displays live status pill (`STAGE`), source ➔ target phrase overview, perfect match or remaining letter badges, and instant expand trigger.
  - *Word Explorer Idle*: Displays live candidate word count, inline clickable quick-add word chips (`+WORD`), and instant expand trigger.
- **Boundary Friction (Rubberband Damping)**: When dragging past layout limits, logarithmic friction damping prevents hard collisions.

---

## 5. Interaction & Feedback

- **Instant Visual State**: Verification badges update synchronously on every keystroke.
- **Micro Toast Notifications**: Subtle, non-blocking toast notifications appear at bottom-right for copy operations, rack transfers, and file exports.
- **Accessible Touch Targets**: All buttons adhere to minimum 36px desktop / 44px mobile touch dimensions.

---

## 6. Design Voice: Pure Data Density & Space Maximization

1. **Every Pixel Belongs to the Data**: Avoid explanatory chrome, decorative title banners, floating reset badges, and empty top/bottom gutters. The data itself—its glyphs, weights, shapes, and colors—is the interface.
2. **Direct-Action State Inversion**: Elements that apply filters must toggle on and off directly upon interaction. Redundant "Clear Filter" chrome is prohibited; users simply click the segment again to turn it off.
3. **Compound Segment Multi-Select**: Analytical views must allow users to click multiple segments to create compound filter sets (e.g., selecting 4-letter and 5-letter words simultaneously) with clean additive and subtractive clicking.
4. **Active Idle Continuity**: Collapsed or minimized components must retain real-time status and actionable micro-interactions via Idle Peek states rather than disappearing completely.
5. **Aspect-Aware Spatial Fluidity**: When viewports or split panels become tall and narrow, elements must dynamically re-distribute and utilize the full vertical column rather than bunching in the center.
6. **Concentric Architectural Geometry**: Nested borders and enclosures must always have parallel radii ($R_{inner} = R_{outer} - \text{padding}$). Curves must never visually pinch or swell in corners.
7. **Self-Documenting Typographic Tiles**: Use explicit, compact typography (`4 LETTERS`, `5 LETTERS`, `167`, `NOUNS`, `129`) directly on interactive elements to eliminate the need for legends, axis labels, or header ribbons.
