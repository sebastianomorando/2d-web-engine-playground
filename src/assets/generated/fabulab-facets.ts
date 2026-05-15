import montagne_1_facetsUrl from "./fabulab-facets/montagne_1_facets.svg";
import montagne_2_facetsUrl from "./fabulab-facets/montagne_2_facets.svg";
import roccia00_facetsUrl from "./fabulab-facets/roccia00_facets.svg";
import roccia01_facetsUrl from "./fabulab-facets/roccia01_facets.svg";
import roccia02_facetsUrl from "./fabulab-facets/roccia02_facets.svg";
import roccia03_facetsUrl from "./fabulab-facets/roccia03_facets.svg";
import roccia04_facetsUrl from "./fabulab-facets/roccia04_facets.svg";

export const FABULAB_FACET_TEXTURE_SOURCES = [
  {
    id: "montagne_1_facets",
    layerId: "montagne_1",
    url: montagne_1_facetsUrl,
    logicalWidth: 1920.02,
    logicalHeight: 832,
  },
  {
    id: "montagne_2_facets",
    layerId: "montagne_2",
    url: montagne_2_facetsUrl,
    logicalWidth: 1920.02,
    logicalHeight: 763,
  },
  {
    id: "roccia00_facets",
    layerId: "roccia00",
    url: roccia00_facetsUrl,
    logicalWidth: 246.3,
    logicalHeight: 355.29,
  },
  {
    id: "roccia01_facets",
    layerId: "roccia01",
    url: roccia01_facetsUrl,
    logicalWidth: 771.64,
    logicalHeight: 956.32,
  },
  {
    id: "roccia02_facets",
    layerId: "roccia02",
    url: roccia02_facetsUrl,
    logicalWidth: 352.29,
    logicalHeight: 331.04,
  },
  {
    id: "roccia03_facets",
    layerId: "roccia03",
    url: roccia03_facetsUrl,
    logicalWidth: 445.43,
    logicalHeight: 650.2,
  },
  {
    id: "roccia04_facets",
    layerId: "roccia04",
    url: roccia04_facetsUrl,
    logicalWidth: 502.29,
    logicalHeight: 471.99,
  },
] as const;

export const FABULAB_FACET_TEXTURE_SOURCE_BY_LAYER = {
  "montagne_1": FABULAB_FACET_TEXTURE_SOURCES[0],
  "montagne_2": FABULAB_FACET_TEXTURE_SOURCES[1],
  "roccia00": FABULAB_FACET_TEXTURE_SOURCES[2],
  "roccia01": FABULAB_FACET_TEXTURE_SOURCES[3],
  "roccia02": FABULAB_FACET_TEXTURE_SOURCES[4],
  "roccia03": FABULAB_FACET_TEXTURE_SOURCES[5],
  "roccia04": FABULAB_FACET_TEXTURE_SOURCES[6],
} as const;
