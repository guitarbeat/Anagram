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

---

## 5. Interaction & Feedback

- **Instant Visual State**: Verification badges update synchronously on every keystroke.
- **Micro Toast Notifications**: Subtle, non-blocking toast notifications appear at bottom-right for copy operations, rack transfers, and file exports.
- **Accessible Touch Targets**: All buttons adhere to minimum 36px desktop / 44px mobile touch dimensions.
