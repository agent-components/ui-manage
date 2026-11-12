/**
 * Public share preview: load via /api/share/:token, always read-only, poll updatedAt.
 */
import { ref } from "vue";

import { toast } from "@/app/shell/ui";
import {
  createTab,
  getActiveStore,
  getTabsSnapshot,
  type Tab,
} from "@/app/tabs";

import { settleSharePageText } from "./share-text";

const POLL_MS = 10_000;

export type ShareMeta = {
  name: string;
  updatedAt: string;
};

const sharePreviewActive = ref(false);

export function isUiManageSharePreview(): boolean {
  return sharePreviewActive.value;
}

/** Set before the first paint so the share canvas is the one that loads fonts. */
export function markSharePreview(): void {
  sharePreviewActive.value = true;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeToken: string | null = null;
let lastUpdatedAt: string | null = null;
let lastContentHash: string | null = null;
let applying = false;

function isBlankDocumentTab(tab: Tab): boolean {
  if (tab.kind !== "document") return false;
  return (
    !tab.store.hasUnsavedChanges() &&
    tab.store.graph.getChildren(tab.store.state.currentPageId).length === 0 &&
    (tab.store.state.documentName === "Untitled" ||
      tab.store.state.documentName === "未命名设计稿")
  );
}

function takeDocumentTab(): Tab {
  return getTabsSnapshot().find(isBlankDocumentTab) ?? createTab();
}

async function fetchShareMeta(token: string): Promise<ShareMeta> {
  const res = await fetch(`/api/share/${encodeURIComponent(token)}`);
  if (!res.ok) {
    throw new Error(
      res.status === 404 ? "分享不存在或已关闭" : `加载分享失败 (${res.status})`
    );
  }
  return (await res.json()) as ShareMeta;
}

async function fetchShareBytes(token: string): Promise<Uint8Array> {
  const res = await fetch(`/api/share/${encodeURIComponent(token)}/content`);
  if (!res.ok) {
    throw new Error(`加载设计稿失败 (${res.status})`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

const patchedStores = new WeakSet<object>();

/**
 * Core's read-only allowlist omits `reportPresented`, so enabling read-only breaks the
 * canvas lifecycle. Temporarily clear the flag while reporting presentation.
 */
function enableShareReadOnly(store: ReturnType<typeof getActiveStore>): void {
  if (!patchedStores.has(store)) {
    patchedStores.add(store);
    const report = store.reportPresented.bind(store);
    store.reportPresented = ((versions) => {
      const was = store.state.hostRestrictions.readOnly;
      if (was) {
        store.state.hostRestrictions = {
          ...store.state.hostRestrictions,
          readOnly: false,
        };
      }
      try {
        return report(versions);
      } finally {
        if (was) {
          store.state.hostRestrictions = {
            ...store.state.hostRestrictions,
            readOnly: true,
          };
        }
      }
    }) as typeof store.reportPresented;
  }
  store.setReadOnly(true);
  // Canvas-only share view: no editor chrome; play mode = pan-only preview.
  store.state.showUI = false;
  store.state.showRulers = true;
  store.startPlay();
}

function decodeShareHash(hash: string): string {
  const raw = (hash || "").replace(/^#/, "").trim();
  if (!raw) return "";
  try {
    let value = decodeURIComponent(raw);
    if (/%[0-9A-Fa-f]{2}/.test(value)) value = decodeURIComponent(value);
    return value.trim();
  } catch {
    return raw;
  }
}

/** 打开稿件后按 URL hash 落到对应页；无 hash 保持首页。 */
async function restoreSharePageFromHash(
  store: ReturnType<typeof getActiveStore>
): Promise<void> {
  const hash = decodeShareHash(
    typeof window !== "undefined" ? window.location.hash : ""
  );
  if (!hash) return;

  const pages = store.graph.getPages();

  const asIndex = /^(\d+)$/.exec(hash);
  const target = asIndex
    ? pages[Number(asIndex[1]) - 1]
    : pages.find((page) => page.name === hash);

  if (!target || target.id === store.state.currentPageId) return;
  await store.switchPage(target.id);
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function applyShareDocument(
  token: string,
  meta: ShareMeta,
  bytes?: Uint8Array
): Promise<void> {
  const fileBytes = bytes ?? (await fetchShareBytes(token));
  const title = meta.name.trim() || "未命名设计稿";
  const tab = takeDocumentTab();
  if (fileBytes.byteLength > 0) {
    const file = new File([fileBytes], `${title}.fig`);
    await tab.store.openFigFile(file);
  }
  tab.store.state.documentName = title;
  enableShareReadOnly(tab.store);
  await restoreSharePageFromHash(tab.store).catch((error) => {
    console.error("[ui-manage share] restore page from hash", error);
  });
  await settleSharePageText(tab.store).catch((error) => {
    console.error("[ui-manage share] settle text", error);
  });
}

function stopSharePolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function stopSharePreview(): void {
  stopSharePolling();
  activeToken = null;
  lastUpdatedAt = null;
  lastContentHash = null;
  applying = false;
  sharePreviewActive.value = false;
}

/** Reload only when the file bytes changed. A newer timestamp with the same bytes is not a refresh. */
async function refreshShareIfChanged(token: string): Promise<void> {
  if (applying || activeToken !== token) return;
  const meta = await fetchShareMeta(token);
  if (activeToken !== token) return;
  if (meta.updatedAt === lastUpdatedAt) return;

  applying = true;
  try {
    const bytes = await fetchShareBytes(token);
    if (activeToken !== token) return;
    const hash = await hashBytes(bytes);
    const title = meta.name.trim() || "未命名设计稿";
    if (hash === lastContentHash) {
      lastUpdatedAt = meta.updatedAt;
      const store = getActiveStore();
      if (store.state.documentName !== title) store.state.documentName = title;
      return;
    }
    await applyShareDocument(token, meta, bytes);
    lastContentHash = hash;
    lastUpdatedAt = meta.updatedAt;
  } finally {
    applying = false;
  }
}

function startSharePolling(token: string): void {
  stopSharePolling();
  pollTimer = setInterval(() => {
    void (async () => {
      if (!activeToken || activeToken !== token) return;
      try {
        await refreshShareIfChanged(token);
      } catch (error) {
        console.error("[ui-manage share poll]", error);
        if (error instanceof Error && error.message.includes("已关闭")) {
          stopSharePreview();
          toast.error(error.message);
        }
      }
    })();
  }, POLL_MS);
}

/** Open a shared design read-only and keep it updated every 10s after saves. */
export async function bootSharePreview(token: string): Promise<boolean> {
  const trimmed = token.trim();
  if (!trimmed) return false;

  stopSharePreview();
  sharePreviewActive.value = true;
  activeToken = trimmed;

  const meta = await fetchShareMeta(trimmed);
  const bytes = await fetchShareBytes(trimmed);
  lastContentHash = await hashBytes(bytes);
  lastUpdatedAt = meta.updatedAt;
  await applyShareDocument(trimmed, meta, bytes);
  startSharePolling(trimmed);
  return true;
}
