# 2D Web Engine Playground

Small TypeScript playground for a browser 2D renderer. It prefers WebGPU when available and falls back to WebGL2.

The current demo recreates the layered `#scene_container` approach from Fabulab's homepage as GPU-rendered textured planes: SVG assets are loaded through Bun's bundler, rasterized by the browser into textures, then projected with a CSS-3D-like camera and pointer parallax.

## Requirements

- Bun 1.3+
- A browser with WebGL2, or WebGPU for the newer backend

## Commands

```sh
bun install
bun run dev
bun run generate:atlas
bun test
bun run build
```

The dev server serves `src/index.html` directly with Bun's HTML bundler. Production output is written to `dist/`.

## Shape

- `src/renderer/renderer.ts`: common 2D renderer interface
- `src/renderer/webgpu-renderer.ts`: WebGPU quad backend
- `src/renderer/webgl-renderer.ts`: WebGL2 quad backend
- `src/renderer/*sprite*`: textured sprite backends for the Fabulab-style scene
- `src/engine/scene.ts`: tiny demo scene/update loop
- `src/engine/fabulab-scene.ts`: layered SVG scene layout and projection
- `src/engine/geometry.ts`: quad packing helpers
- `src/math`: minimal 2D math primitives
- `scripts/generate-fabulab-atlas.ts`: offline SVG extraction/rasterization for repeated tree leaf sprites
- `src/assets/generated/fabulab-atlas.*`: generated PNG atlas and typed sprite manifest

The checked-in Fabulab SVG files are for local technical reproduction of the renderer behavior. Confirm asset rights before using them in a public or commercial build.
