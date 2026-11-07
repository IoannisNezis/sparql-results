export type RenderConfig =
  | TableRenderConfig
  | LinePlotRenderConfig
  | PetrimapsRenderConfig;

/** A demo/test fixture: a result set bundled with the ways to render it. */
export interface Fixture {
  data: SPARQLResults;
  configs: RenderConfig[];
}

export interface TableRenderConfig {
  type: "table";
  /**
   * Opt in to infinite scrolling. When set, the table emits a `load-more`
   * CustomEvent as the user scrolls near the bottom; respond by fetching the
   * next page and feeding it back via `SparqlResults.append_results`.
   */
  paginated?: boolean;
}

export interface LinePlotRenderConfig {
  type: "lineplot";
  /** Variable used for the x-axis. */
  x: string;
  /** One or more variables rendered as individual lines. */
  y: string[];
  /** Optional axis labels; defaults to the variable names. */
  xLabel?: string;
  yLabel?: string;
}

/** Rendering style of a petrimaps layer. */
export type PetrimapsStyle = "auto" | "objects" | "heatmap" | "raster";

/** How a petrimaps layer is switched in the layer control. */
export type PetrimapsToggle = "checkbox" | "radio";

/**
 * Map rendering via qlever-petrimaps. Mirrors the per-query config of the
 * petrimaps `/query?cfg=` endpoint: one entry in `layers` per rendered layer.
 */
export interface PetrimapsRenderConfig {
  type: "petrimaps";
  layers: PetrimapsLayer[];
}

/** One rendered layer; the keys match petrimaps' layer objects. */
export interface PetrimapsLayer {
  /** Query variable (with leading `?`, e.g. `?geom`) holding the WKT geometry. */
  geomfield: string;
  /** Stable layer id; petrimaps auto-generates one if omitted. */
  id?: string;
  /** Human-readable layer name shown in the UI; defaults to `geomfield`. */
  name?: string;
  /** Query variable (with leading `?`) holding a numeric weight for `heatmap` and `raster` styles. */
  weightfield?: string;
  /** Query variable (with leading `?`) holding the raster-metadata subject. */
  rasterfield?: string;
  /**
   * How the layer is switched in the UI: `checkbox` layers can be turned on
   * and off independently, `radio` layers (default) are mutually exclusive.
   */
  toggle?: PetrimapsToggle;
  /** Whether a `checkbox` layer starts switched on (petrimaps default: true). */
  enabled?: boolean;
  /** Layer-switcher tab the layer is listed under; ungrouped layers share a default tab. */
  group?: string;
  /** Raster cell width in web-mercator pseudometers (petrimaps default: 10). */
  rasterw?: number;
  /** Raster cell height in web-mercator pseudometers (petrimaps default: 10). */
  rasterh?: number;
  /** Object color as 6-digit hex without `#` (petrimaps default: "3388ff"). */
  color?: string;
  /** Heatmap/raster color scheme (petrimaps default: "spectralexp"). */
  colorscheme?: string;
  /** Rendering style (petrimaps default: "auto"). */
  style?: PetrimapsStyle;
  /** Line width of rendered objects (petrimaps default: 3). */
  linew?: number;
  /** Fill opacity of rendered polygons, 0–1 (petrimaps default: 0.5). */
  fillopacity?: number;
  /** Opacity of rendered lines, 0–1 (petrimaps default: 1). */
  lineopacity?: number;
  /** Radius of rendered points (petrimaps default: 3). */
  pointradius?: number;
}

export interface SPARQLResults {
  head: SPARQLHead;
  results: SPARQLBindings;
}

export interface SPARQLHead {
  vars: string[];
  prefixes?: PrefixMap;
  link?: string[];
}

export interface PrefixMap {
  [prefix: string]: string;
}

export interface SPARQLBindings {
  bindings: Binding[];
}

export interface Binding {
  [variable: string]: BindingValue;
}

export type BindingValue =
  | URIValue
  | LiteralValue
  | BlankNodeValue
  | TripleValue;

export interface URIValue {
  type: "uri";
  value: string;
  curie?: string;
}

export interface LiteralValue {
  type: "literal";
  value: string;
  "xml:lang"?: string;
  datatype?: string;
}

export interface BlankNodeValue {
  type: "bnode";
  value: string;
}

// SPARQL-star support
export interface TripleValue {
  type: "triple";
  value: {
    subject: BindingValue;
    predicate: BindingValue;
    object: BindingValue;
  };
}

// Helper type for type guards
export function isURIValue(value: BindingValue): value is URIValue {
  return value.type === "uri";
}

export function isLiteralValue(value: BindingValue): value is LiteralValue {
  return value.type === "literal";
}

export function isBlankNodeValue(value: BindingValue): value is BlankNodeValue {
  return value.type === "bnode";
}

export function isTripleValue(value: BindingValue): value is TripleValue {
  return value.type === "triple";
}
