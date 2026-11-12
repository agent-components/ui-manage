import type { Color } from "@open-pencil/scene-graph/primitives";

export { IS_BROWSER } from "@open-pencil/core/constants";

export const PEER_COLORS: Color[] = [
  { r: 0.96, g: 0.26, b: 0.21, a: 1 },
  { r: 0.13, g: 0.59, b: 0.95, a: 1 },
  { r: 0.3, g: 0.69, b: 0.31, a: 1 },
  { r: 1.0, g: 0.76, b: 0.03, a: 1 },
  { r: 0.61, g: 0.15, b: 0.69, a: 1 },
  { r: 1.0, g: 0.34, b: 0.13, a: 1 },
  { r: 0.0, g: 0.74, b: 0.83, a: 1 },
  { r: 0.91, g: 0.12, b: 0.39, a: 1 },
];

export const ASSET_GRID_THUMBNAIL_SIZE = 96;
export const ASSET_LIST_THUMBNAIL_SIZE = 40;
export const ASSET_THUMBNAIL_RENDER_SCALE = 2;

export const HALF_FRAC = 3 / 7;
export const HUD_TOP = 12 + 32 + 6 + 32 + 12;

export const SWIPE_THRESHOLD = 30;
export const SWIPE_VELOCITY_THRESHOLD = 500;
export const DRAWER_SPRING_STIFFNESS = 800;
export const DRAWER_SPRING_DAMPING = 50;

export const ACTION_TOAST_DURATION = 800;

/** The viewport HTML is laid out in when imported: a common design width. */
export const HTML_IMPORT_VIEWPORT = { width: 1440, height: 900 } as const;
