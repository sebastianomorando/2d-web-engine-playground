import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface Point2 {
  x: number;
  y: number;
}

interface Facet {
  points: readonly Point2[];
  fill: string;
  opacity: number;
}

interface FacetAsset {
  layerId: string;
  assetId: string;
  width: number;
  height: number;
  facets: readonly Facet[];
}

const ROOT = resolve(import.meta.dir, "..");
const OUT_DIR = resolve(ROOT, "src/assets/generated/fabulab-facets");
const OUT_MANIFEST = resolve(ROOT, "src/assets/generated/fabulab-facets.ts");

const MOUNTAIN_SHADOW = "#850545";
const MOUNTAIN_BODY = "#d40f55";
const MOUNTAIN_WARM = "#ff5477";
const MOUNTAIN_DARK = "#5c0033";
const ROCK_WARM = "#ffa38f";
const ROCK_BODY = "#c27a88";
const ROCK_SHADOW = "#6b455c";
const ROCK_GLOW = "#ffd2b8";

const assets: readonly FacetAsset[] = [
  {
    layerId: "montagne_1",
    assetId: "montagne_1_facets",
    width: 1920.02,
    height: 832,
    facets: [
      triangle([70, 562], [560, 328], [675, 808], MOUNTAIN_SHADOW, 0.18),
      triangle([560, 328], [1047, 18], [878, 790], MOUNTAIN_WARM, 0.14),
      triangle([1047, 18], [1290, 326], [1134, 790], MOUNTAIN_BODY, 0.15),
      triangle([1182, 260], [1320, 72], [1440, 760], MOUNTAIN_DARK, 0.13),
      triangle([1418, 134], [1648, 42], [1555, 748], MOUNTAIN_WARM, 0.12),
      triangle([1648, 42], [1920, 356], [1768, 744], MOUNTAIN_BODY, 0.12),
    ],
  },
  {
    layerId: "montagne_2",
    assetId: "montagne_2_facets",
    width: 1920.02,
    height: 763,
    facets: [
      triangle([920, 356], [1320, 138], [1210, 735], MOUNTAIN_WARM, 0.13),
      triangle([1240, 235], [1570, 238], [1428, 742], MOUNTAIN_BODY, 0.15),
      triangle([1570, 238], [1920, 465], [1748, 748], MOUNTAIN_DARK, 0.16),
      triangle([1480, 222], [1920, 10], [1820, 470], MOUNTAIN_WARM, 0.1),
      triangle([760, 690], [1045, 535], [950, 760], MOUNTAIN_SHADOW, 0.16),
    ],
  },
  rockAsset("roccia00", 246.3, 355.29),
  rockAsset("roccia01", 771.64, 956.32),
  rockAsset("roccia02", 352.29, 331.04),
  rockAsset("roccia03", 445.43, 650.2),
  rockAsset("roccia04", 502.29, 471.99),
];

mkdirSync(OUT_DIR, { recursive: true });

for (const asset of assets) {
  writeFileSync(resolve(OUT_DIR, `${asset.assetId}.svg`), renderFacetSvg(asset));
}

writeFileSync(OUT_MANIFEST, renderManifest(assets));

console.log(`Generated ${assets.length} facet SVG assets in ${OUT_DIR}`);
console.log(`Generated ${OUT_MANIFEST}`);

function rockAsset(layerId: string, width: number, height: number): FacetAsset {
  return {
    layerId,
    assetId: `${layerId}_facets`,
    width,
    height,
    facets: [
      triangle(
        relative(width, height, 0.24, 0.34),
        relative(width, height, 0.72, 0.26),
        relative(width, height, 0.5, 0.5),
        ROCK_WARM,
        0.18,
      ),
      triangle(
        relative(width, height, 0.5, 0.5),
        relative(width, height, 0.78, 0.36),
        relative(width, height, 0.66, 0.82),
        ROCK_BODY,
        0.18,
      ),
      triangle(
        relative(width, height, 0.18, 0.42),
        relative(width, height, 0.5, 0.5),
        relative(width, height, 0.35, 0.82),
        ROCK_SHADOW,
        0.2,
      ),
      triangle(
        relative(width, height, 0.35, 0.82),
        relative(width, height, 0.66, 0.82),
        relative(width, height, 0.5, 0.94),
        ROCK_SHADOW,
        0.16,
      ),
      triangle(
        relative(width, height, 0.34, 0.31),
        relative(width, height, 0.53, 0.22),
        relative(width, height, 0.47, 0.4),
        ROCK_GLOW,
        0.12,
      ),
      triangle(
        relative(width, height, 0.63, 0.45),
        relative(width, height, 0.74, 0.53),
        relative(width, height, 0.6, 0.66),
        ROCK_SHADOW,
        0.12,
      ),
    ],
  };
}

function triangle(
  a: readonly [number, number] | Point2,
  b: readonly [number, number] | Point2,
  c: readonly [number, number] | Point2,
  fill: string,
  opacity: number,
): Facet {
  return {
    points: [point(a), point(b), point(c)],
    fill,
    opacity,
  };
}

function relative(width: number, height: number, x: number, y: number): Point2 {
  return {
    x: width * x,
    y: height * y,
  };
}

function point(value: readonly [number, number] | Point2): Point2 {
  return Array.isArray(value) ? { x: value[0], y: value[1] } : value;
}

function renderFacetSvg(asset: FacetAsset): string {
  const polygons = asset.facets
    .map((facet) => {
      const points = facet.points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(" ");
      return `  <polygon points="${points}" fill="${facet.fill}" opacity="${formatNumber(facet.opacity)}"/>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(asset.width)} ${formatNumber(asset.height)}">\n<g>\n${polygons}\n</g>\n</svg>\n`;
}

function renderManifest(facetAssets: readonly FacetAsset[]): string {
  const imports = facetAssets
    .map((asset) => `import ${asset.assetId}Url from "./fabulab-facets/${asset.assetId}.svg";`)
    .join("\n");
  const sources = facetAssets
    .map((asset) => {
      return `  {\n    id: "${asset.assetId}",\n    layerId: "${asset.layerId}",\n    url: ${asset.assetId}Url,\n    logicalWidth: ${formatNumber(asset.width)},\n    logicalHeight: ${formatNumber(asset.height)},\n  }`;
    })
    .join(",\n");
  const byLayer = facetAssets
    .map((asset, index) => `  "${asset.layerId}": FABULAB_FACET_TEXTURE_SOURCES[${index}],`)
    .join("\n");

  return `${imports}\n\nexport const FABULAB_FACET_TEXTURE_SOURCES = [\n${sources},\n] as const;\n\nexport const FABULAB_FACET_TEXTURE_SOURCE_BY_LAYER = {\n${byLayer}\n} as const;\n`;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}
