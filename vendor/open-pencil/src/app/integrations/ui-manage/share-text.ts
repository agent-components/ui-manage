/**
 * Share uses the same canvas as editor preview. Preview can draw Chinese because the
 * requested face is loaded and text is shaped live. A share viewer often has no PingFang,
 * and the file's saved outlines for those characters are the font's missing-glyph box.
 * Load the CJK fallback the preview would shape with, then drop those boxes so the
 * canvas paints the live paragraph instead.
 */
import { fontManager } from "@open-pencil/core/text";
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

function hanCharacters(graph: SceneGraph, rootIds: readonly string[]): string {
  const characters = new Set<string>();
  const walk = (id: string) => {
    const node = graph.getNode(id);
    if (!node) return;
    if (node.type === "TEXT" && node.text) {
      for (const character of node.text) {
        if (/\p{Script=Han}/u.test(character)) characters.add(character);
      }
    }
    for (const childId of node.childIds) walk(childId);
  };
  for (const id of rootIds) walk(id);
  return Array.from(characters).join("");
}

/**
 * The page switch already loads the faces the editor preview loads. Saved
 * missing-glyph boxes would still paint over a fallback, so drop them and make
 * sure the CJK fallback is in the same shaper the preview uses.
 */
export async function settleSharePageText(store: ShareCanvas): Promise<void> {
  const rootIds = store.graph
    .getChildren(store.state.currentPageId)
    .map((node) => node.id);
  if (rootIds.length === 0) return;
  const dropped = dropMissingGlyphOutlines(store.graph, rootIds);
  if (dropped) {
    store.renderer?.invalidateAllPictures();
    store.requestRender();
  }
  const characters = hanCharacters(store.graph, rootIds);
  if (!characters) return;
  await fontManager.ensureFallbackPack(["cjk-sc"], characters);
  store.renderer?.invalidateAllPictures();
  store.requestRender();
}
