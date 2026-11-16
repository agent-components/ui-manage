/**
 * Share uses the same canvas and the same font preparation as the editor.
 * Saved missing-glyph boxes would paint over that live text, so drop only those boxes.
 * Do not load another fallback here: a second face makes the share page look unlike the editor.
 */
import type { SceneGraph, SceneNode } from "@open-pencil/scene-graph";
import {
  GeometryCommand,
  readGeometryBlob,
} from "@open-pencil/scene-graph/geometry";

type ShareCanvas = {
  graph: SceneGraph;
  state: { currentPageId: string };
  renderer: { invalidateAllPictures(): void } | null;
  requestRender(): void;
};

function isMissingGlyphOutline(blob: Uint8Array): boolean {
  let curves = 0;
  let subpaths = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  readGeometryBlob(blob, (command, coords) => {
    if (command === GeometryCommand.MOVE) subpaths += 1;
    if (command === GeometryCommand.QUAD || command === GeometryCommand.CUBIC) {
      curves += 1;
    }
    for (let index = 0; index < coords.length; index += 2) {
      const x = coords[index];
      const y = coords[index + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });
  if (curves > 0 || subpaths < 2) return false;
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) return false;
  return width < 0.55 && height > 0.85 && height / width > 2;
}

function dropMissingGlyphOutlines(
  graph: SceneGraph,
  rootIds: readonly string[]
): boolean {
  let changed = false;
  const walk = (id: string) => {
    const node = graph.getNode(id);
    if (!node) return;
    if (node.type === "TEXT" && usesMissingGlyphOutlines(node)) {
      node.derivedTextGlyphs = null;
      node.textPicture = null;
      changed = true;
    }
    for (const childId of node.childIds) walk(childId);
  };
  for (const id of rootIds) walk(id);
  return changed;
}

function usesMissingGlyphOutlines(node: SceneNode): boolean {
  return (
    node.derivedTextGlyphs?.some(
      (glyph) =>
        glyph.emojiCodePoints === undefined &&
        isMissingGlyphOutline(glyph.commandsBlob)
    ) === true
  );
}

/** Page fonts are already prepared the same way as the editor. Drop baked missing-glyph boxes only. */
export function settleSharePageText(store: ShareCanvas): void {
  const rootIds = store.graph
    .getChildren(store.state.currentPageId)
    .map((node) => node.id);
  if (rootIds.length === 0) return;
  if (!dropMissingGlyphOutlines(store.graph, rootIds)) return;
  store.renderer?.invalidateAllPictures();
  store.requestRender();
}
