import cieloUrl from "../assets/fabulab-scene/cielo.svg";
import fiumeUrl from "../assets/fabulab-scene/fiume.svg";
import montagne1Url from "../assets/fabulab-scene/montagne_1.svg";
import montagne2Url from "../assets/fabulab-scene/montagne_2.svg";
import nuvole1Url from "../assets/fabulab-scene/nuvole_1.svg";
import nuvole2Url from "../assets/fabulab-scene/nuvole_2.svg";
import roccia00Url from "../assets/fabulab-scene/roccia00.svg";
import roccia01Url from "../assets/fabulab-scene/roccia01.svg";
import roccia02Url from "../assets/fabulab-scene/roccia02.svg";
import roccia03Url from "../assets/fabulab-scene/roccia03.svg";
import roccia04Url from "../assets/fabulab-scene/roccia04.svg";
import {
  FABULAB_FACET_TEXTURE_SOURCE_BY_LAYER,
  FABULAB_FACET_TEXTURE_SOURCES,
} from "../assets/generated/fabulab-facets";
import {
  FABULAB_GRASS_INSTANCES,
  FABULAB_MANTLE_INSTANCE,
  FABULAB_SCENE_ATLAS_SIZE,
  FABULAB_SCENE_ATLAS_SOURCE,
  FABULAB_SCENE_FRAMES,
  FABULAB_TREE_INSTANCES,
} from "../assets/generated/fabulab-atlas";
import { trianglesFromQuad, type SpriteDraw, type SpriteTexture, type SpriteTextureSource, type SpriteVertex } from "../renderer/sprite-renderer";

export interface FabulabSceneSettings {
  parallax: number;
  cameraZoom: number;
  cameraX: number;
  cameraY: number;
  drift: number;
  entrance: number;
}

export interface PointerState {
  x: number;
  y: number;
}

export interface ViewportState {
  width: number;
  height: number;
  devicePixelRatio: number;
}

interface LayerSource {
  id: string;
  url: string;
  xVw: number;
  yVw: number;
  zVw: number;
  scale: number;
  floatX?: number;
  floatY?: number;
  entranceYVw?: number;
}

interface Layer extends LayerSource {
  width: number;
  height: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
}

type Point2 = ProjectedPoint;
type AtlasFrameId = keyof typeof FABULAB_SCENE_FRAMES;
type FacetLayerId = keyof typeof FABULAB_FACET_TEXTURE_SOURCE_BY_LAYER;

interface QuadDeformation {
  topLeft?: Point2;
  topRight?: Point2;
  bottomRight?: Point2;
  bottomLeft?: Point2;
}

interface ProjectedQuad {
  topLeft: ProjectedPoint;
  topRight: ProjectedPoint;
  bottomRight: ProjectedPoint;
  bottomLeft: ProjectedPoint;
}

interface ProjectionBasis {
  left: number;
  top: number;
  z: number;
  scaledWidth: number;
  scaledHeight: number;
  baseWidth: number;
  baseHeight: number;
  origin: { x: number; y: number; z: number };
  perspective: number;
  stage: { x: number; y: number; scale: number };
  yaw: number;
  pitch: number;
}

interface ProjectedLayer extends ProjectionBasis {
  quad: ProjectedQuad;
}

const DESIGN_WIDTH = 1260;
const DESIGN_HEIGHT = 682;

export const FABULAB_TEXTURE_SOURCES: readonly SpriteTextureSource[] = [
  FABULAB_SCENE_ATLAS_SOURCE,
  { id: "cielo", url: cieloUrl, logicalWidth: 2648.95, logicalHeight: 1429.8 },
  { id: "nuvole_1", url: nuvole1Url, logicalWidth: 2206, logicalHeight: 377.46 },
  { id: "fiume", url: fiumeUrl, logicalWidth: 1307.66, logicalHeight: 457.8 },
  { id: "montagne_1", url: montagne1Url, logicalWidth: 1920.02, logicalHeight: 832 },
  { id: "montagne_2", url: montagne2Url, logicalWidth: 1920.02, logicalHeight: 763 },
  { id: "nuvole_2", url: nuvole2Url, logicalWidth: 800, logicalHeight: 190 },
  { id: "roccia00", url: roccia00Url, logicalWidth: 246.3, logicalHeight: 355.29 },
  { id: "roccia01", url: roccia01Url, logicalWidth: 771.64, logicalHeight: 956.32 },
  { id: "roccia02", url: roccia02Url, logicalWidth: 352.29, logicalHeight: 331.04 },
  { id: "roccia03", url: roccia03Url, logicalWidth: 445.43, logicalHeight: 650.2 },
  { id: "roccia04", url: roccia04Url, logicalWidth: 502.29, logicalHeight: 471.99 },
  ...FABULAB_FACET_TEXTURE_SOURCES,
];

const LAYERS: readonly LayerSource[] = [
  { id: "cielo", url: cieloUrl, xVw: 14, yVw: -16, zVw: -120, scale: 4, floatX: 0.25 },
  { id: "nuvole_1", url: nuvole1Url, xVw: -14, yVw: 14, zVw: -92, scale: 2.5, floatX: 1.1 },
  { id: "fiume", url: fiumeUrl, xVw: -42, yVw: 51, zVw: -88, scale: 2, floatY: 0.35 },
  { id: "montagne_1", url: montagne1Url, xVw: 49, yVw: 32, zVw: -80, scale: 3 },
  { id: "montagne_2", url: montagne2Url, xVw: 2, yVw: 32, zVw: -48, scale: 2.3 },
  { id: "nuvole_2", url: nuvole2Url, xVw: 30, yVw: -15, zVw: -50, scale: 1.2, floatX: -0.8 },
  { id: "roccia00", url: roccia00Url, xVw: 18, yVw: 28, zVw: -45, scale: 0.3, entranceYVw: -71 },
  { id: "roccia01", url: roccia01Url, xVw: 42, yVw: 66, zVw: -42, scale: 0.7, entranceYVw: -25 },
  { id: "roccia02", url: roccia02Url, xVw: -2, yVw: 28, zVw: -41, scale: 0.35, entranceYVw: -18 },
  { id: "roccia03", url: roccia03Url, xVw: 60, yVw: 51, zVw: -41, scale: 0.5, entranceYVw: -28 },
  { id: "roccia04", url: roccia04Url, xVw: 90, yVw: 75, zVw: -40, scale: 0.5, entranceYVw: -31 },
];

const TREE_LAYER: LayerSource = {
  id: "fabulab_scene_atlas",
  url: FABULAB_SCENE_ATLAS_SOURCE.url,
  xVw: -75,
  yVw: -51,
  zVw: -30,
  scale: 1.6,
};

const FIELD_LAYER: LayerSource = {
  id: "fabulab_scene_atlas",
  url: FABULAB_SCENE_ATLAS_SOURCE.url,
  xVw: -39,
  yVw: 38,
  zVw: -40,
  scale: 1.6,
  floatY: 0.2,
};

export function createFabulabScene(
  textures: readonly SpriteTexture[],
  viewport: ViewportState,
  pointer: PointerState,
  time: number,
  settings: FabulabSceneSettings,
): readonly SpriteDraw[] {
  const textureMap = new Map(textures.map((texture) => [texture.id, texture]));
  const layers = LAYERS.map((layer) => {
    const texture = textureMap.get(layer.id);
    if (!texture) {
      return undefined;
    }

    return { ...layer, width: texture.width, height: texture.height };
  }).filter((layer): layer is Layer => Boolean(layer));

  const drawGroups: Array<{ zVw: number; draws: readonly SpriteDraw[] }> = layers.map((layer) => {
    const projected = createProjectedLayer(layer, viewport, pointer, time, settings);
    const draws = [projectLayer(layer.id, projected)];
    const facetSource = facetSourceForLayer(layer.id);
    if (facetSource && textureMap.has(facetSource.id)) {
      draws.push(projectLayer(facetSource.id, projected));
    }

    return {
      zVw: layer.zVw,
      draws,
    };
  });

  const sceneAtlas = textureMap.get(FABULAB_SCENE_ATLAS_SOURCE.id);
  if (sceneAtlas) {
    const fieldLayer = {
      ...FIELD_LAYER,
      width: FABULAB_SCENE_FRAMES.cavaliere_base.logicalWidth,
      height: FABULAB_SCENE_FRAMES.cavaliere_base.logicalHeight,
    };
    drawGroups.push({
      zVw: fieldLayer.zVw,
      draws: projectFieldLayer(fieldLayer, viewport, pointer, time, settings),
    });
  }

  const draws = drawGroups
    .sort((a, b) => a.zVw - b.zVw)
    .flatMap((group) => group.draws);

  const treeTexture = textureMap.get(FABULAB_SCENE_ATLAS_SOURCE.id);
  if (treeTexture) {
    const treeLayer = {
      ...TREE_LAYER,
      width: FABULAB_SCENE_FRAMES.albero_trunk.logicalWidth,
      height: FABULAB_SCENE_FRAMES.albero_trunk.logicalHeight,
    };
    draws.push(...projectTreeLayer(treeLayer, viewport, pointer, time, settings));
  }

  return draws;
}

function projectLayer(
  textureId: string,
  projected: ProjectedLayer,
): SpriteDraw {
  const corners = projectRect(projected, 0, 0, projected.baseWidth, projected.baseHeight, {
    u0: 0,
    v0: 0,
    u1: 1,
    v1: 1,
  });

  return {
    textureId,
    vertices: corners,
  };
}

function facetSourceForLayer(layerId: string): (typeof FABULAB_FACET_TEXTURE_SOURCES)[number] | undefined {
  if (layerId in FABULAB_FACET_TEXTURE_SOURCE_BY_LAYER) {
    return FABULAB_FACET_TEXTURE_SOURCE_BY_LAYER[layerId as FacetLayerId];
  }

  return undefined;
}

function projectTreeLayer(
  layer: Layer,
  viewport: ViewportState,
  pointer: PointerState,
  time: number,
  settings: FabulabSceneSettings,
): readonly SpriteDraw[] {
  const projected = createProjectedLayer(layer, viewport, pointer, time, settings);
  const draws: SpriteDraw[] = [
    projectAtlasFrame(projected, "albero_trunk", 0, 0, layer.width, layer.height),
  ];

  for (const instance of FABULAB_TREE_INSTANCES) {
    draws.push(
      projectAtlasFrame(
        projected,
        instance.frame,
        instance.x,
        instance.y,
        instance.width,
        instance.height,
        leafWind(instance, time),
      ),
    );
  }

  return draws;
}

function projectFieldLayer(
  layer: Layer,
  viewport: ViewportState,
  pointer: PointerState,
  time: number,
  settings: FabulabSceneSettings,
): readonly SpriteDraw[] {
  const projected = createProjectedLayer(layer, viewport, pointer, time, settings);
  const draws: SpriteDraw[] = [
    projectAtlasFrame(projected, "cavaliere_base", 0, 0, layer.width, layer.height),
  ];

  for (const instance of FABULAB_GRASS_INSTANCES) {
    draws.push(
      projectAtlasFrame(
        projected,
        instance.frame,
        instance.x,
        instance.y,
        instance.width,
        instance.height,
        grassWind(instance, time),
      ),
    );
  }
  draws.push(...projectMantle(projected, time));

  return draws;
}

function projectAtlasFrame(
  projected: ProjectedLayer,
  frameId: AtlasFrameId,
  x: number,
  y: number,
  width: number,
  height: number,
  deformation?: QuadDeformation,
): SpriteDraw {
  const frame = FABULAB_SCENE_FRAMES[frameId];
  const uv = {
    u0: frame.x / FABULAB_SCENE_ATLAS_SIZE.width,
    v0: frame.y / FABULAB_SCENE_ATLAS_SIZE.height,
    u1: (frame.x + frame.width) / FABULAB_SCENE_ATLAS_SIZE.width,
    v1: (frame.y + frame.height) / FABULAB_SCENE_ATLAS_SIZE.height,
  };

  return {
    textureId: FABULAB_SCENE_ATLAS_SOURCE.id,
    vertices: projectRect(projected, x, y, width, height, uv, deformation),
  };
}

function projectAtlasSubFrame(
  projected: ProjectedLayer,
  frameId: AtlasFrameId,
  x: number,
  y: number,
  width: number,
  height: number,
  sourceX: number,
  sourceWidth: number,
  deformation?: QuadDeformation,
): SpriteDraw {
  const frame = FABULAB_SCENE_FRAMES[frameId];
  const uv = {
    u0: (frame.x + sourceX) / FABULAB_SCENE_ATLAS_SIZE.width,
    v0: frame.y / FABULAB_SCENE_ATLAS_SIZE.height,
    u1: (frame.x + sourceX + sourceWidth) / FABULAB_SCENE_ATLAS_SIZE.width,
    v1: (frame.y + frame.height) / FABULAB_SCENE_ATLAS_SIZE.height,
  };

  return {
    textureId: FABULAB_SCENE_ATLAS_SOURCE.id,
    vertices: projectRect(projected, x, y, width, height, uv, deformation),
  };
}

function projectMantle(projected: ProjectedLayer, time: number): readonly SpriteDraw[] {
  const instance = FABULAB_MANTLE_INSTANCE;
  const strips = 8;
  const overlap = 0.75;
  const draws: SpriteDraw[] = [];

  for (let index = 0; index < strips; index++) {
    const sourceX = (instance.width / strips) * index;
    const sourceWidth = index === strips - 1 ? instance.width - sourceX : instance.width / strips + overlap;
    const leftRatio = sourceX / instance.width;
    const rightRatio = Math.min(1, (sourceX + sourceWidth) / instance.width);
    const left = mantleWind(time, leftRatio);
    const right = mantleWind(time, rightRatio);

    draws.push(
      projectAtlasSubFrame(
        projected,
        "mantello",
        instance.x + sourceX,
        instance.y,
        sourceWidth,
        instance.height,
        sourceX,
        sourceWidth,
        {
          topLeft: { x: left.x * 0.55, y: left.y * 0.4 },
          bottomLeft: left,
          topRight: { x: right.x * 0.55, y: right.y * 0.4 },
          bottomRight: right,
        },
      ),
    );
  }

  return draws;
}

function createProjectedLayer(
  layer: Layer,
  viewport: ViewportState,
  pointer: PointerState,
  time: number,
  settings: FabulabSceneSettings,
): ProjectedLayer {
  const stage = createStage(viewport, settings);
  const unit = DESIGN_WIDTH / 100;
  const origin = {
    x: DESIGN_WIDTH * 0.5,
    y: DESIGN_HEIGHT * 0.5,
    z: 0,
  };
  const perspective = DESIGN_WIDTH * 0.5;
  const drift = Math.sin(time * 0.00025 + layer.zVw) * settings.drift;
  const x = layer.xVw * unit + (layer.floatX ?? 0) * drift * unit;
  const finalYVw = lerp(layer.entranceYVw ?? layer.yVw, layer.yVw, settings.entrance);
  const y = finalYVw * unit + (layer.floatY ?? 0) * drift * unit;
  const z = layer.zVw * unit;
  const baseWidth = layer.width;
  const baseHeight = layer.height;
  const scaledWidth = baseWidth * layer.scale;
  const scaledHeight = baseHeight * layer.scale;
  const left = x + (baseWidth - scaledWidth) * 0.5;
  const top = y + (baseHeight - scaledHeight) * 0.5;
  const yaw = -pointer.x * settings.parallax * 0.11;
  const pitch = pointer.y * settings.parallax * 0.045;

  const basis: ProjectionBasis = {
    left,
    top,
    z,
    scaledWidth,
    scaledHeight,
    baseWidth,
    baseHeight,
    origin,
    perspective,
    stage,
    yaw,
    pitch,
  };

  return {
    ...basis,
    quad: {
      topLeft: projectPoint(basis, 0, 0),
      topRight: projectPoint(basis, baseWidth, 0),
      bottomRight: projectPoint(basis, baseWidth, baseHeight),
      bottomLeft: projectPoint(basis, 0, baseHeight),
    },
  };
}

function projectRect(
  projected: ProjectedLayer,
  x: number,
  y: number,
  width: number,
  height: number,
  uv: { u0: number; v0: number; u1: number; v1: number },
  deformation?: QuadDeformation,
): readonly SpriteVertex[] {
  const corners = [
    {
      ...projectLocalPoint(projected, x + (deformation?.topLeft?.x ?? 0), y + (deformation?.topLeft?.y ?? 0)),
      u: uv.u0,
      v: uv.v0,
      alpha: 1,
    },
    {
      ...projectLocalPoint(
        projected,
        x + width + (deformation?.topRight?.x ?? 0),
        y + (deformation?.topRight?.y ?? 0),
      ),
      u: uv.u1,
      v: uv.v0,
      alpha: 1,
    },
    {
      ...projectLocalPoint(
        projected,
        x + width + (deformation?.bottomRight?.x ?? 0),
        y + height + (deformation?.bottomRight?.y ?? 0),
      ),
      u: uv.u1,
      v: uv.v1,
      alpha: 1,
    },
    {
      ...projectLocalPoint(
        projected,
        x + (deformation?.bottomLeft?.x ?? 0),
        y + height + (deformation?.bottomLeft?.y ?? 0),
      ),
      u: uv.u0,
      v: uv.v1,
      alpha: 1,
    },
  ];

  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
    throw new Error("Invalid sprite corners");
  }

  return trianglesFromQuad(topLeft, topRight, bottomRight, bottomLeft);
}

function projectLocalPoint(projected: ProjectedLayer, x: number, y: number): ProjectedPoint {
  return pointInQuad(projected.quad, x / projected.baseWidth, y / projected.baseHeight);
}

function projectPoint(projected: ProjectionBasis, x: number, y: number): ProjectedPoint {
  const scaleX = projected.scaledWidth / projected.baseWidth;
  const scaleY = projected.scaledHeight / projected.baseHeight;
  const point = {
    x: projected.left + x * scaleX,
    y: projected.top + y * scaleY,
    z: projected.z,
  };
  const rotated = rotateAroundOrigin(point, projected.origin, projected.yaw, projected.pitch);
  const depth = Math.max(0.05, projected.perspective - rotated.z);
  const factor = projected.perspective / depth;

  return {
    x:
      projected.stage.x +
      (projected.origin.x + (rotated.x - projected.origin.x) * factor) * projected.stage.scale,
    y:
      projected.stage.y +
      (projected.origin.y + (rotated.y - projected.origin.y) * factor) * projected.stage.scale,
  };
}

function pointInQuad(quad: ProjectedQuad, x: number, y: number): ProjectedPoint {
  const top = mixPoint(quad.topLeft, quad.topRight, x);
  const bottom = mixPoint(quad.bottomLeft, quad.bottomRight, x);
  return mixPoint(top, bottom, y);
}

function mixPoint(from: ProjectedPoint, to: ProjectedPoint, amount: number): ProjectedPoint {
  return {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount),
  };
}

function grassWind(instance: { x: number; y: number; width: number; height: number }, time: number): QuadDeformation {
  const phase = time * 0.0032 + instance.x * 0.021 + instance.y * 0.009;
  const sway = Math.sin(phase) * 5 + Math.sin(phase * 0.47 + 1.8) * 2;
  const lift = Math.sin(phase * 0.73) * 1.2;

  return {
    topLeft: { x: sway * 0.7, y: lift },
    topRight: { x: sway, y: -lift * 0.4 },
    bottomLeft: { x: 0, y: 0 },
    bottomRight: { x: 0, y: 0 },
  };
}

function leafWind(instance: { x: number; y: number; width: number; height: number }, time: number): QuadDeformation {
  const phase = time * 0.0016 + instance.x * 0.006 + instance.y * 0.004;
  const sway = Math.sin(phase) * 8 + Math.sin(phase * 1.7) * 2.5;
  const curl = Math.cos(phase * 0.9) * 3;

  return {
    topLeft: { x: sway - curl, y: -Math.abs(curl) * 0.25 },
    topRight: { x: sway + curl, y: Math.abs(curl) * 0.2 },
    bottomRight: { x: sway * 0.25, y: 0 },
    bottomLeft: { x: sway * 0.25, y: 0 },
  };
}

function mantleWind(time: number, xRatio: number): Point2 {
  const looseEdge = (1 - xRatio) ** 1.35;
  const phase = time * 0.00145 + xRatio * 5.2;

  return {
    x: looseEdge * (Math.sin(phase) * 18 + Math.sin(phase * 2.1) * 5),
    y: looseEdge * (Math.cos(phase * 1.35) * 5),
  };
}

function createStage(
  viewport: ViewportState,
  settings: FabulabSceneSettings,
): { x: number; y: number; scale: number } {
  const scale = Math.max(viewport.width / DESIGN_WIDTH, viewport.height / DESIGN_HEIGHT) * settings.cameraZoom;

  return {
    x: (viewport.width - DESIGN_WIDTH * scale) * 0.5 - settings.cameraX * scale,
    y: (viewport.height - DESIGN_HEIGHT * scale) * 0.5 - settings.cameraY * scale,
    scale,
  };
}

function rotateAroundOrigin(
  point: { x: number; y: number; z: number },
  origin: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
): { x: number; y: number; z: number } {
  const px = point.x - origin.x;
  const py = point.y - origin.y;
  const pz = point.z - origin.z;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const yawX = px * cosYaw + pz * sinYaw;
  const yawZ = -px * sinYaw + pz * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const pitchY = py * cosPitch - yawZ * sinPitch;
  const pitchZ = py * sinPitch + yawZ * cosPitch;

  return {
    x: yawX + origin.x,
    y: pitchY + origin.y,
    z: pitchZ + origin.z,
  };
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * clamp01(amount);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
