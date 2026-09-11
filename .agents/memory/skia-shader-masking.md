---
name: Skia shader masking on RN Skia
description: How to mask a noise/gradient shader by another gradient without blackening the destination; measuring generated assets before wiring anchors.
---
- Never use `BlendMode.Modulate` on a paint to "mask" a previous draw: transparent parts of the source multiply the destination to black (showed up as black/lit rectangles over water and road).
- Compose shaders instead: `Skia.Shader.MakeBlend(BlendMode.SrcIn, noise, maskGradient)` (SrcIn worked, DstIn rendered nothing in this RN Skia build) and draw once with the combined shader.
- Fractal-noise draws dominate the CPU harness (`render:preview`) cost, not the on-device GPU; judge perf regressions by draw count/allocations, not harness ms alone.
- Generated character/backdrop art: always re-measure from the alpha mask / colour scan (muzzle = mean x of top opaque rows, sea horizon = first row that is ≥ 99 % water colour) before updating `visuals.ts` / `HORIZON_IMAGE_LINE`.
