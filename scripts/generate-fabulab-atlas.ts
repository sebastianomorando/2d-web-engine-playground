import { Resvg } from "@resvg/resvg-js";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { PNG } from "pngjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface SpriteImage {
  id: string;
  png: PNG;
  logicalWidth: number;
  logicalHeight: number;
}

interface PackedSprite extends SpriteImage {
  x: number;
  y: number;
}

interface AtlasInstance {
  frame: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FieldSprites {
  sprites: readonly SpriteImage[];
  grassInstances: readonly AtlasInstance[];
  mantleInstance: AtlasInstance;
}

const ROOT = resolve(import.meta.dir, "..");
const TREE_SOURCE = resolve(ROOT, "src/assets/fabulab-scene/albero.svg");
const FIELD_SOURCE = resolve(ROOT, "src/assets/fabulab-scene/cavaliere.svg");
const OUT_DIR = resolve(ROOT, "src/assets/generated");
const OUT_PNG = resolve(OUT_DIR, "fabulab-atlas.png");
const OUT_TS = resolve(OUT_DIR, "fabulab-atlas.ts");
const ATLAS_ID = "fabulab_scene_atlas";
const LEAF_GROUP = /^slide01_(?:back)?foglie/;
const LEAF_KIND = /^slide01_(backfoglie\d+|foglie\d+)/;
const GRASS_ELEMENT = /^slide01_erba/;
const GRASS_KIND = /^slide01_(erba\d+)/;
const MANTLE_ID = "slide01_mantello";
const KNIGHT_OCCLUSION = { minX: 650, minY: 200, maxX: 1220, maxY: 660 };
const PADDING = 8;

const source = readFileSync(TREE_SOURCE, "utf8");
const sourceDoc = new DOMParser().parseFromString(source, "image/svg+xml");
removeElements(sourceDoc, "script");

const svg = sourceDoc.documentElement;
const viewBox = parseViewBox(svg.getAttribute("viewBox") ?? "0 0 1700.1 1834.77");
const defs = serializeFirst(sourceDoc, "defs");
const leafGroups = findElements(sourceDoc, "g").filter((node) =>
  LEAF_GROUP.test(node.getAttribute("id") ?? ""),
);

const baseDoc = new DOMParser().parseFromString(source, "image/svg+xml");
removeElements(baseDoc, "script");
for (const group of findElements(baseDoc, "g")) {
  if (LEAF_GROUP.test(group.getAttribute("id") ?? "")) {
    group.parentNode?.removeChild(group);
  }
}

const trunk = renderSvg(
  new XMLSerializer().serializeToString(baseDoc),
  Math.ceil(viewBox.width),
  Math.ceil(viewBox.height),
);

const instances: AtlasInstance[] = [];
const archetypes = new Map<string, PNG>();

for (const group of leafGroups) {
  const id = group.getAttribute("id") ?? "";
  const kind = LEAF_KIND.exec(id)?.[1] ?? id;
  const groupPng = renderIsolatedGroup(defs, group, viewBox);
  const bounds = alphaBounds(groupPng);
  if (!bounds) {
    continue;
  }
  const paddedBounds = padBounds(groupPng, bounds, PADDING);

  instances.push({
    frame: kind,
    x: paddedBounds.minX,
    y: paddedBounds.minY,
    width: paddedBounds.maxX - paddedBounds.minX,
    height: paddedBounds.maxY - paddedBounds.minY,
  });

  if (!archetypes.has(kind)) {
    archetypes.set(kind, cropPng(groupPng, paddedBounds));
  }
}

const sprites: SpriteImage[] = [
  {
    id: "albero_trunk",
    png: trunk,
    logicalWidth: viewBox.width,
    logicalHeight: viewBox.height,
  },
];

for (const [kind, png] of archetypes) {
  sprites.push({
    id: kind,
    png,
    logicalWidth: png.width,
    logicalHeight: png.height,
  });
}

const field = extractFieldSprites();
const atlas = packSprites([...sprites, ...field.sprites]);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PNG, PNG.sync.write(atlas.png));
writeFileSync(OUT_TS, formatManifest(atlas, instances, field.grassInstances, field.mantleInstance));

console.log(`Generated ${OUT_PNG}`);
console.log(`Generated ${OUT_TS}`);
console.log(
  `Packed ${atlas.sprites.length} sprites, ${instances.length} tree leaf instances, and ${field.grassInstances.length} grass instances.`,
);

function extractFieldSprites(): FieldSprites {
  const fieldSource = readFileSync(FIELD_SOURCE, "utf8");
  const sourceDoc = new DOMParser().parseFromString(fieldSource, "image/svg+xml");
  removeElements(sourceDoc, "script");

  const svg = sourceDoc.documentElement;
  const viewBox = parseViewBox(svg.getAttribute("viewBox") ?? "0 0 1823.89 737.49");
  const defs = serializeFirst(sourceDoc, "defs");
  const grassElements = findElements(sourceDoc, "*").filter((node) =>
    GRASS_ELEMENT.test(node.getAttribute("id") ?? ""),
  );
  const mantleElement = findElements(sourceDoc, "*").find((node) => node.getAttribute("id") === MANTLE_ID);
  if (!mantleElement) {
    throw new Error(`Missing ${MANTLE_ID} in ${FIELD_SOURCE}`);
  }

  const extractedGrassIds = new Set<string>();
  const grassInstances: AtlasInstance[] = [];
  const grassArchetypes = new Map<string, PNG>();

  for (const element of grassElements) {
    const id = element.getAttribute("id") ?? "";
    const kind = GRASS_KIND.exec(id)?.[1] ?? id;
    const elementPng = renderIsolatedGroup(defs, element, viewBox);
    const bounds = alphaBounds(elementPng);
    if (!bounds) {
      continue;
    }
    const paddedBounds = padBounds(elementPng, bounds, PADDING);

    if (intersects(paddedBounds, KNIGHT_OCCLUSION)) {
      continue;
    }

    extractedGrassIds.add(id);
    grassInstances.push({
      frame: kind,
      x: paddedBounds.minX,
      y: paddedBounds.minY,
      width: paddedBounds.maxX - paddedBounds.minX,
      height: paddedBounds.maxY - paddedBounds.minY,
    });

    if (!grassArchetypes.has(kind)) {
      grassArchetypes.set(kind, cropPng(elementPng, paddedBounds));
    }
  }

  const mantlePng = renderIsolatedGroup(defs, mantleElement, viewBox);
  const mantleBounds = alphaBounds(mantlePng);
  if (!mantleBounds) {
    throw new Error(`Empty ${MANTLE_ID} render`);
  }
  const paddedMantleBounds = padBounds(mantlePng, mantleBounds, PADDING);
  const mantle = cropPng(mantlePng, paddedMantleBounds);
  const baseDoc = new DOMParser().parseFromString(fieldSource, "image/svg+xml");
  removeElements(baseDoc, "script");
  for (const element of findElements(baseDoc, "*")) {
    const id = element.getAttribute("id") ?? "";
    if (extractedGrassIds.has(id) || id === MANTLE_ID) {
      element.parentNode?.removeChild(element);
    }
  }

  const fieldBase = renderSvg(
    new XMLSerializer().serializeToString(baseDoc),
    Math.ceil(viewBox.width),
    Math.ceil(viewBox.height),
  );
  const grassSprites: SpriteImage[] = [
    {
      id: "cavaliere_base",
      png: fieldBase,
      logicalWidth: viewBox.width,
      logicalHeight: viewBox.height,
    },
  ];

  for (const [kind, png] of grassArchetypes) {
    grassSprites.push({
      id: kind,
      png,
      logicalWidth: png.width,
      logicalHeight: png.height,
    });
  }
  grassSprites.push({
    id: "mantello",
    png: mantle,
    logicalWidth: mantle.width,
    logicalHeight: mantle.height,
  });

  return {
    sprites: grassSprites,
    grassInstances,
    mantleInstance: {
      frame: "mantello",
      x: paddedMantleBounds.minX,
      y: paddedMantleBounds.minY,
      width: paddedMantleBounds.maxX - paddedMantleBounds.minX,
      height: paddedMantleBounds.maxY - paddedMantleBounds.minY,
    },
  };
}

function renderSvg(svgSource: string, width: number, height: number): PNG {
  const result = new Resvg(svgSource, {
    fitTo: {
      mode: "width",
      value: width,
    },
  }).render();
  const png = PNG.sync.read(result.asPng());

  if (png.width === width && png.height === height) {
    return png;
  }

  return png;
}

function renderIsolatedGroup(
  defs: string,
  group: Element,
  viewBox: { x: number; y: number; width: number; height: number },
): PNG {
  const groupSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}">${defs}${serializeElementWithTransforms(group)}</svg>`;
  return renderSvg(groupSvg, Math.ceil(viewBox.width), Math.ceil(viewBox.height));
}

function serializeElementWithTransforms(element: Element): string {
  const transforms: string[] = [];
  let parent = element.parentNode;

  while (parent && parent.nodeType === 1 && (parent as Element).tagName.toLowerCase() !== "svg") {
    const transform = (parent as Element).getAttribute("transform");
    if (transform) {
      transforms.unshift(transform);
    }
    parent = parent.parentNode;
  }

  const serialized = new XMLSerializer().serializeToString(element);
  return transforms.reduceRight((content, transform) => `<g transform="${escapeAttribute(transform)}">${content}</g>`, serialized);
}

function alphaBounds(png: PNG): Bounds | undefined {
  const bounds = emptyBounds();

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const alpha = png.data[(y * png.width + x) * 4 + 3];
      if (alpha > 0) {
        addPoint(bounds, x, y);
      }
    }
  }

  if (!isFinite(bounds.minX)) {
    return undefined;
  }

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX + 1,
    maxY: bounds.maxY + 1,
  };
}

function padBounds(source: PNG, bounds: Bounds, padding: number): Bounds {
  return {
    minX: Math.max(0, Math.floor(bounds.minX - padding)),
    minY: Math.max(0, Math.floor(bounds.minY - padding)),
    maxX: Math.min(source.width, Math.ceil(bounds.maxX + padding)),
    maxY: Math.min(source.height, Math.ceil(bounds.maxY + padding)),
  };
}

function cropPng(source: PNG, bounds: Bounds): PNG {
  const x = Math.max(0, Math.floor(bounds.minX));
  const y = Math.max(0, Math.floor(bounds.minY));
  const right = Math.min(source.width, Math.ceil(bounds.maxX));
  const bottom = Math.min(source.height, Math.ceil(bounds.maxY));
  const width = Math.max(1, right - x);
  const height = Math.max(1, bottom - y);
  const cropped = new PNG({ width, height, colorType: 6 });
  cropped.data.fill(0);
  PNG.bitblt(source, cropped, x, y, width, height, 0, 0);
  return cropped;
}

function packSprites(sprites: readonly SpriteImage[]): { png: PNG; sprites: readonly PackedSprite[] } {
  const width = nextPowerOfTwo(Math.max(...sprites.map((sprite) => sprite.png.width)));
  const rows: Array<{ y: number; height: number; sprites: PackedSprite[] }> = [];
  let y = 0;
  let x = 0;
  let rowHeight = 0;

  for (const sprite of sprites) {
    if (x > 0 && x + sprite.png.width > width) {
      y += rowHeight + PADDING;
      x = 0;
      rowHeight = 0;
    }

    let row = rows[rows.length - 1];
    if (!row || x === 0) {
      row = { y, height: 0, sprites: [] };
      rows.push(row);
    }

    row.sprites.push({ ...sprite, x, y });
    row.height = Math.max(row.height, sprite.png.height);
    x += sprite.png.width + PADDING;
    rowHeight = Math.max(rowHeight, sprite.png.height);
  }

  const height = nextPowerOfTwo(y + rowHeight);
  const png = new PNG({ width, height, colorType: 6 });
  png.data.fill(0);

  const packed = rows.flatMap((row) => row.sprites);
  for (const sprite of packed) {
    PNG.bitblt(sprite.png, png, 0, 0, sprite.png.width, sprite.png.height, sprite.x, sprite.y);
  }

  return { png, sprites: packed };
}

function formatManifest(
  atlas: { png: PNG; sprites: readonly PackedSprite[] },
  instances: readonly AtlasInstance[],
  grassInstances: readonly AtlasInstance[],
  mantleInstance: AtlasInstance,
): string {
  const frames = Object.fromEntries(
    atlas.sprites.map((sprite) => [
      sprite.id,
      {
        x: sprite.x,
        y: sprite.y,
        width: sprite.png.width,
        height: sprite.png.height,
        logicalWidth: sprite.logicalWidth,
        logicalHeight: sprite.logicalHeight,
      },
    ]),
  );

  return `import atlasUrl from "./fabulab-atlas.png";

export const FABULAB_SCENE_ATLAS_SOURCE = {
  id: ${JSON.stringify(ATLAS_ID)},
  url: atlasUrl,
  logicalWidth: ${atlas.png.width},
  logicalHeight: ${atlas.png.height},
} as const;

export const FABULAB_SCENE_ATLAS_SIZE = {
  width: ${atlas.png.width},
  height: ${atlas.png.height},
} as const;

export const FABULAB_SCENE_FRAMES = ${JSON.stringify(frames, null, 2)} as const;

export const FABULAB_TREE_INSTANCES = ${JSON.stringify(instances, null, 2)} as const;

export const FABULAB_GRASS_INSTANCES = ${JSON.stringify(grassInstances, null, 2)} as const;

export const FABULAB_MANTLE_INSTANCE = ${JSON.stringify(mantleInstance, null, 2)} as const;
`;
}

function parseViewBox(value: string): { x: number; y: number; width: number; height: number } {
  const [x = 0, y = 0, width = 0, height = 0] = value.split(/\s+/).map(Number);
  return { x, y, width, height };
}

function serializeFirst(doc: Document, tagName: string): string {
  const node = doc.getElementsByTagName(tagName)[0];
  return node ? new XMLSerializer().serializeToString(node) : "";
}

function removeElements(doc: Document, tagName: string): void {
  const nodes = Array.from(doc.getElementsByTagName(tagName));
  for (const node of nodes) {
    node.parentNode?.removeChild(node);
  }
}

function findElements(doc: Document | Element, tagName: string): Element[] {
  return Array.from(doc.getElementsByTagName(tagName));
}

function intersects(a: Bounds, b: Bounds): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function boundsFor(element: Element): Bounds | undefined {
  const bounds = emptyBounds();

  for (const path of findElements(element, "path")) {
    addPathBounds(bounds, path.getAttribute("d") ?? "");
  }

  for (const polygon of [...findElements(element, "polygon"), ...findElements(element, "polyline")]) {
    addPointListBounds(bounds, polygon.getAttribute("points") ?? "");
  }

  return isFinite(bounds.minX) ? bounds : undefined;
}

function addPathBounds(bounds: Bounds, pathData: string): void {
  const numbers = pathData.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];

  for (let index = 0; index + 1 < numbers.length; index += 2) {
    addPoint(bounds, numbers[index], numbers[index + 1]);
  }
}

function addPointListBounds(bounds: Bounds, points: string): void {
  const numbers = points.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];

  for (let index = 0; index + 1 < numbers.length; index += 2) {
    addPoint(bounds, numbers[index], numbers[index + 1]);
  }
}

function addPoint(bounds: Bounds, x: number, y: number): void {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function emptyBounds(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(1, value)));
}
