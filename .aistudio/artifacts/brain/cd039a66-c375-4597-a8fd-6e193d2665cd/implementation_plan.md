# Smart Dynamic Single-Path Filing Folder Tab

Implement an elegant, single-component dynamic SVG filing folder tab that measures the active tab button's width and renders a unified mathematical path with an 8px outward-curved flared base and 9px rounded shoulders, completely eliminating multi-piece seams, rectangular mask leaks, and visual artifacts.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following architectural decisions in Phase 1 clarification:
> - **Architecture**: Single continuous SVG tab shell that scales dynamically.
> - **Proportions & Fit**: Snug fit with consistent horizontal padding (`px-3.5 sm:px-4`).

---

## 1. Overview & Core Concept

- **The Problem in Previous Implementations**:
  Slicing the tab into 3 separate elements (LeftCap SVG, Center div, RightCap SVG) and applying a rectangular white mask caused:
  1. Subpixel alignment seams where the center div met the SVG curves.
  2. Rectangular white shelves/steps (as seen in `image_cc7ef136.png`) because the rectangular mask extended horizontally past where the curved flare ended.
- **The Smart Solution**:
  Build a dedicated `<FilingTabShell />` component that:
  1. Uses a `useResizeObserver` / `useCallback` ref to measure the active tab's exact natural width $W$ and height $H$.
  2. Generates **one single mathematical SVG `<path>`** for the entire tab:
     - Outward-curved flared base ($r = 8\text{px}$) starting tangent to the horizontal baseline.
     - Straight vertical walls carrying the icon, label, and badge.
     - Smooth convex top shoulders ($r = 9\text{px}$) curving into the top horizontal edge.
     - Symmetrical right convex shoulder and right $r = 8\text{px}$ concave flared base.
     - White fill path that strictly hugs the outer contour and closes 3px below the baseline to seamlessly connect into the white page below.
  3. No separate pieces, no rectangular masks, no CSS border conflicts, and zero right angles.

---

## 2. Technical Architecture & Component Specification

### Dynamic SVG Geometry Generator

Given measured width $W$ and height $H = 34\text{px}$:
- $r_{\text{base}} = 8\text{px}$ (concave outward flare)
- $r_{\text{top}} = 9\text{px}$ (convex shoulder)
- Total SVG width: $W + 2 \times r_{\text{base}} = W + 16\text{px}$
- Total SVG height: $H + 3\text{px} = 37\text{px}$

```
(17, 1)                      (W-1, 1)
   ╭────────────────────────────╮
  ╱                              ╲
(8, 10)                        (W+8, 10)
  │                                │
  │        WORDS / STATS           │
  │                                │
(8, 26)                        (W+8, 26)
 ╰╮                              ╭╯
──┴──────────────────────────────┴── Baseline (y = 34)
(0, 34)                        (W+16, 34)
  └──────────────────────────────┘   Fill closure (y = 37)
```

### Path Generation Algorithm

```typescript
function generateFilingTabPaths(w: number, h: number = 34, rBase: number = 8, rTop: number = 9) {
  const x0 = 0;
  const x1 = rBase;              // 8
  const x2 = rBase + rTop;       // 17
  const x3 = Math.max(x2, w + rBase - rTop);
  const x4 = w + rBase;
  const x5 = w + 2 * rBase;

  const yBase = h;               // 34
  const yWallBottom = h - rBase; // 26
  const yWallTop = rTop + 1;     // 10
  const yTop = 1;

  // Single continuous contour stroke
  const strokePath = [
    `M ${x0} ${yBase}`,
    `A ${rBase} ${rBase} 0 0 0 ${x1} ${yWallBottom}`,
    `L ${x1} ${yWallTop}`,
    `A ${rTop} ${rTop} 0 0 1 ${x2} ${yTop}`,
    `L ${x3} ${yTop}`,
    `A ${rTop} ${rTop} 0 0 1 ${x4} ${yWallTop}`,
    `L ${x4} ${yWallBottom}`,
    `A ${rBase} ${rBase} 0 0 0 ${x5} ${yBase}`,
  ].join(' ');

  // Single fill path: follows the exact contour, then closes under baseline
  const fillPath = `${strokePath} L ${x5} ${yBase + 3} L ${x0} ${yBase + 3} Z`;

  return { strokePath, fillPath, totalWidth: x5, totalHeight: h + 3 };
}
```

---

## 3. Implementation Steps

1. **Create `src/components/FilingTabShell.tsx`**:
   - Encapsulates the dynamic path math and single SVG element.
   - Accepts `width` and `height`, and renders the `<svg>` with zero subpixel seams.
2. **Integrate into `src/components/SplitDivider.tsx` (`AccessoryItem`)**:
   - Attach a resize ref to the active button to obtain its measured width.
   - Render `<FilingTabShell width={buttonWidth} height={34} />` positioned at `left-[-8px] top-0 pointer-events-none -z-10`.
   - Remove all previous 3-piece SVGs and rectangular baseline masks.
   - Keep inactive complication tabs as smooth rounded pills (`rounded-xl`).
3. **Verification**:
   - Test across all tabs (`WORDS`, `GRAPH`, `BLOCKS`, `STATS`, `SOLVE`, `WORDS ⫽ SOLVE 3682`).
   - Run `lint_applet` and `compile_applet`.
