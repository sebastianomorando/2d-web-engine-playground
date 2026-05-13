# 2D Web Engine Playground

Small TypeScript playground for a browser 2D renderer. It prefers WebGPU when available and falls back to WebGL2.

## Requirements

- Bun 1.3+
- A browser with WebGL2, or WebGPU for the newer backend

## Commands

```sh
bun install
bun run dev
bun test
bun run build
```

The dev server serves `src/index.html` directly with Bun's HTML bundler. Production output is written to `dist/`.

## Shape

- `src/renderer/renderer.ts`: common 2D renderer interface
- `src/renderer/webgpu-renderer.ts`: WebGPU quad backend
- `src/renderer/webgl-renderer.ts`: WebGL2 quad backend
- `src/engine/scene.ts`: tiny demo scene/update loop
- `src/engine/geometry.ts`: quad packing helpers
- `src/math`: minimal 2D math primitives
