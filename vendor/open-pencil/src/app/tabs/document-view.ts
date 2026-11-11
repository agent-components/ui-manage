import type { EditorStore } from "@/app/editor/session";

/** ui-manage: recent-files removed — document view memory is a no-op. */

export type DocumentViewMemory = {
  pageId: string;
  center: { x: number; y: number };
  zoom: number;
};

type ViewedDocument = Pick<
  EditorStore,
  | "graph"
  | "state"
  | "getDocumentFilePath"
  | "getStorageBinding"
  | "getViewportSize"
>;

export function rememberDocumentView(_store: ViewedDocument): void {}

export function rememberedDocumentView(
  _store: ViewedDocument
): DocumentViewMemory | null {
  return null;
}
