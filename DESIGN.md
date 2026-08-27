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

# Overview

Anagram Lab is built upon a **Precision Darkroom Studio** aesthetic. It marries the sterile rigor of a typography typesetting laboratory with tactile physics and neon-hued verification telemetry.

**Creative North Star: "The Mechanical Typesetter's Laboratory"**

The interface treats every letter not as ephemeral text, but as a physical tile with mass, frequency, and trajectory. Layouts emphasize information density without sensory overload, utilizing high-contrast zinc gradations, hairline 1px borders, crisp tabular numbers, and rich monospace telemetry.

**Key Characteristics:**
- **Obsidian & Zinc Backdrop**: Deep `#09090b` and `#18181b` canvas depths that allow vibrant letter tiles and motion arcs to command visual focus.
- **Hairline Precision**: 1px subtle zinc borders (`#27272a` / `#3f3f46`) creating structured instrument panels without heavy bevels or drop-shadow clutter.
- **Auditory & Tactile Resonance**: Instant micro-feedback with subtle pop/chime SFX, confetti on exact solutions, and smooth timeline scrubbing.

---

# Colors

Colors follow a strict functional hierarchy: obsidian neutrals provide stable grounding, while strategic semaphores communicate mathematical exactness, warnings, and active states.

### Palette Roles & Values
- **Canvas Base (Obsidian)**: `#09090b` (zinc-950) — Used for global background and embedded canvas containers.
- **Surface Elevation (Zinc Dark)**: `#18181b` (zinc-900) / `#27272a` (zinc-800) — Used for instrument panels, control decks, and interactive cards.
- **Borders & Dividers**: `#27272a` (zinc-800) / `#3f3f46` (zinc-700) — Hairline structural definitions.
- **Primary Text & Highlights**: `#f4f4f5` (zinc-100) / `#ffffff` — Crisp legibility for solution phrases and dominant headers.
- **Secondary / Telemetry Text**: `#a1a1aa` (zinc-400) / `#71717a` (zinc-500) — Used for letter counters, word scores, and metadata.
- **Exact Truth Emerald**: `#10b981` (emerald-500) / `#059669` — Verification badges, exact anagram indicators, and positive state confirmation.
- **Warning & Highlight Amber**: `#f59e0b` (amber-500) — Streaks, unsolved anagram reminders, and high scores.
- **Action Sky**: `#38bdf8` (sky-400) — Branch navigation, interactive sliders, and focus rings.

**The Semantic Semaphore Rule.** Color is never applied purely for ornamental decoration; emerald is reserved exclusively for validated mathematical truth, amber for warnings/streaks, and sky/cyan for active tools.

---

# Typography

The typographic system emphasizes monospace clarity for letter multisets and numerical statistics, paired with clean geometric sans-serif for interface controls.

### Font Roles & Hierarchy
- **Letter Multisets & Formulae**: Monospace (`ui-monospace`, `Menlo`, `Monaco`) in medium/bold weights. Ensures consistent letter-width alignment when comparing source and target phrases.
- **Headings & Primary Labels**: Clean geometric sans or monospace uppercase (`tracking-wider`, `text-[11px]`).
- **Body & Explanations**: Sans-serif (`text-xs` to `text-sm`, `text-zinc-300`, `leading-relaxed`).

**The Alignment Tabular Rule.** Any count, frequency chip, time counter, or Scrabble value must render in a monospace tabular typeface to prevent jitter during real-time typing and solver execution.

---

# Layout

The layout uses a responsive single-column workbench model flanked by contextual tool panels and a unified sticky navigation toolbar.

### Spatial Rhythm
- **Global Container**: Max width 1280px (`max-w-7xl`), centered with fluid responsive gutters (`px-4 sm:px-6`).
- **Card Spacing**: 16px to 24px vertical separation between workbench sections.
- **Dense Control Grids**: 2-column on mobile, expanding to 4 or 6-column parameter decks on desktop (`gap-3`).

**The Compact Command Deck Rule.** Controls and filter options must be consolidated into structured grid decks rather than sprawling multi-page forms, ensuring the primary input and output viewports remain visible simultaneously.

---

# Elevation & Depth

Surfaces rely on tonal layering and crisp 1px borders rather than heavy blur shadows, reinforcing the hardware instrument feel.

- **Level 0 (Canvas)**: `#09090b` flat backdrop.
- **Level 1 (Panels & Cards)**: `#18181b` with 1px `#27272a` borders.
- **Level 2 (Interactive Tiles & Chips)**: `#27272a` hoverable chips with `#3f3f46` active borders.
- **Floating Modals / Dropdowns**: `#09090b` with `#27272a` perimeter and 24px soft ambient shadow (`shadow-2xl`).

---

# Shapes

Form language is modern, understated, and functional.

- **Tiles & Chips**: Slightly rounded rectangles (`rounded-md` 6px or `rounded-lg` 8px).
- **Control Buttons**: 6px (`rounded-md`) for secondary micro-actions; 8px (`rounded-lg`) for primary triggers.
- **Pills & Badges**: Fully rounded (`rounded-full`) for count badges, or 4px (`rounded`) for compact letter tags.

---

# Components

### Primary Interactive Primitives
1. **Letter Chip**: A compact monospace tile displaying a single glyph and count multiplier (e.g. `[ A ×2 ]`).
2. **Solver Result Card**: High-contrast card featuring the rearranged phrase, thematic rating, copy/save/animate quick actions, and letter breakdown telemetry.
3. **Motion Canvas Frame**: An HTML5 interactive viewport with integrated scrubber timeline, loop controls, FPS selector, and direct GIF/PNG export.
4. **Partition Node (Word Chain)**: Branching pathway nodes that visually depict remaining multiset inventory after each lexical subtraction.

---

# Do's and Don'ts

### Do's
- Always display letter counts and multiset verification chips alongside candidate phrases.
- Provide instant one-click pathways between tools (e.g., "Animate in Motion Studio", "Verify in Lie Detector").
- Keep SFX subtle, non-intrusive, and easily toggleable from the global toolbar.
- Maintain strict 100% letter conservation across all solver operations.

### Don'ts
- Do not introduce low-contrast text that compromises legibility on dark backgrounds.
- Do not use arbitrary floating pastel gradients or decorative blobs that clash with the precision laboratory aesthetic.
- Do not hide validation errors or silently drop extra characters.
