# Full-Screen Dense Rectangular Packing for All Words in Graph View

## Overview
Update the Graph view (`WordsGraphView.tsx`) so that **100% of eligible words** (e.g., all 1,414+ words) are always rendered on the canvas simultaneously without artificial subset caps (`120` / `350`), packed into a **dense rectangular layout** that fills the entire screen aspect ratio, with **fixed-scale capsules** and unrestricted **manual zoom/pan**.

---

## Key Changes

### 1. Always Show All Words in Graph View
- Remove the `120` / `350` pagination cap (`capacityMode`) in `WordsGraphView.tsx` so that `activeWords` always equals the complete `eligibleWords` list across every filter mode (`ALL`, `SOLVABLE`, `RISKY`, and letter/length filters).
- Replace the subset selector in the bottom-right HUD with a clean total count indicator and zoom controls (`-`, `Reset / Fit All`, `+`, and current zoom percentage).

### 2. Dense Rectangular Full-Screen Packing (`layoutNodesInWorldSpace`)
- Replace the elliptical phyllotaxis spiral (which left large empty white margins around a central oval) with a **Dense Rectangular Row/Brick Packing** algorithm tailored to the exact canvas aspect ratio (`width / height`):
  - Compute the total area of all word capsules (`width + gapX` by `height + gapY`) and derive a target rectangular world width `W` and height `H` whose ratio `W / H` matches the viewport's exact aspect ratio (`canvas.clientWidth / canvas.clientHeight`).
  - Pack word capsules sequentially across horizontal rows with tight uniform spacing (`gapX = 6px`, `gapY = 6px`), centering each row so the resulting block forms a crisp, edge-to-edge rectangular mosaic that fills the entire viewport when fitted.
  - Re-compute the rectangular aspect ratio automatically if the viewport is resized or toggled into/out of Split View.

### 3. Fixed Word Scale & Deep Manual Zoom / Pan
- **Fixed Scale on Hover**: Keep all word capsules at their exact world scale when hovered (no pop-out magnification on hover), relying on manual zoom as requested while preserving instant hover compatibility dimming (fading incompatible words to low opacity) and the top-left HUD inspection badge.
- **Unrestricted Zoom Range**: Lower the minimum auto-fit scale floor (`0.05x`) and expand the manual wheel/pinch zoom range (`0.2x` to `8.0x` relative to the fitted view) with zoom-toward-cursor math so you can smoothly zoom all the way out to see all 1,414+ words fitted edge-to-edge or zoom deeply into any region.
