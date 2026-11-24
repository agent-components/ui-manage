import type { FigmaAPI } from "@open-pencil/core/figma-api";
import { findPageId } from "@open-pencil/core/io";

/**
 * 画布工具来自编辑器，内部会读 figma.currentPage。
 * HTTP 不保留这一次调用的页面，所以调用时读页要带 page_id，新建图层要带 parent_id。
 * 这里负责在调用前把当前页切对、把参数摆好，调用后再把结果收一收。
 * 参数说明见 ../definitions/canvas.ts。
 */

const READS_PAGE = new Set([
  "find_nodes",
  "page_bounds",
  "get_page_tree",
  "export_svg",
  "export_png",
]);

const NEEDS_PARENT = new Set([
  "create_shape",
  "create_vector",
  "import_svg",
  "insert_icon",
  "render",
  "create_instance",
]);

export async function prepareScope(
  figma: FigmaAPI,
  name: string,
  args: Record<string, unknown>
): Promise<{
  args: Record<string, unknown>;
  after?: (result: unknown) => Promise<void>;
}> {
  await resetPage(figma);
  const next = { ...args };

  if (READS_PAGE.has(name)) {
    await bindPage(figma, name, next);
    delete next.page_id;
    return { args: next };
  }

  if (!NEEDS_PARENT.has(name)) return { args: next };

  const parentId = takeString(next, "parent_id");
  if (name === "create_instance") delete next.parent_id;
  else if (parentId) next.parent_id = parentId;

  if (name === "render") {
    const replaceId = takeString(next, "replace_id");
    if (replaceId) next.replace_id = replaceId;
    if (!parentId && !replaceId)
      throw new Error("缺少 parent_id 或 replace_id");
    if (parentId) requireNode(figma, parentId, "父节点不存在");
    return { args: next };
  }

  if (!parentId) throw new Error("缺少 parent_id");
  requireNode(figma, parentId, "父节点不存在");
  if (name !== "create_instance") return { args: next };

  const pageId = pageOf(figma, parentId);
  if (!pageId) throw new Error(`父节点不存在: ${parentId}`);
  await usePage(figma, pageId);
  return {
    args: next,
    after: async (result) => {
      if (parentId === pageId) return;
      const id = createdId(result);
      if (!id) return;
      const node = figma.getNodeById(id);
      const parent = figma.getNodeById(parentId);
      if (node && parent) parent.appendChild(node);
    },
  };
}

export function scopeResult(name: string, result: unknown): unknown {
  if (name !== "list_pages" || !result || typeof result !== "object")
    return result;
  if (Array.isArray(result)) return result;
  const { current: _current, ...pages } = result as Record<string, unknown>;
  return pages;
}

function takeString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) return null;
    ids.push(item.trim());
  }
  return ids;
}

function requireNode(figma: FigmaAPI, id: string, message: string) {
  if (!figma.graph.getNode(id)) throw new Error(`${message}: ${id}`);
}

function pageOf(figma: FigmaAPI, id: string): string | null {
  const node = figma.graph.getNode(id);
  if (!node) return null;
  if (node.type === "CANVAS") return node.id;
  return findPageId(figma.graph, id);
}

async function resetPage(figma: FigmaAPI) {
  const first = figma.graph.getPages()[0];
  if (!first) return;
  await usePage(figma, first.id);
}

async function usePage(figma: FigmaAPI, pageId: string) {
  const raw = figma.graph.getNode(pageId);
  if (raw?.type !== "CANVAS") throw new Error(`页面不存在: ${pageId}`);
  const page = figma.getNodeById(pageId);
  if (!page) throw new Error(`页面不存在: ${pageId}`);
  await figma.setCurrentPageAsync(page);
}

async function bindPage(
  figma: FigmaAPI,
  name: string,
  args: Record<string, unknown>
) {
  const pageId = takeString(args, "page_id");
  const ids = stringList(args.ids);
  const rootId = takeString(args, "root_id");

  if (name === "get_page_tree") {
    if (!pageId && !rootId) throw new Error("缺少 page_id 或 root_id");
    if (pageId) await usePage(figma, pageId);
    return;
  }

  if (name === "find_nodes" || name === "page_bounds") {
    if (!pageId) throw new Error("缺少 page_id");
    await usePage(figma, pageId);
    return;
  }

  if (pageId && ids) {
    await usePage(figma, pageId);
    for (const id of ids) {
      const page = pageOf(figma, id);
      if (!page) throw new Error(`节点不存在: ${id}`);
      if (page !== pageId) throw new Error(`节点不在该页: ${id}`);
    }
    return;
  }
  if (pageId) {
    await usePage(figma, pageId);
    return;
  }
  if (ids) {
    let resolved: string | null = null;
    for (const id of ids) {
      const page = pageOf(figma, id);
      if (!page) throw new Error(`节点不存在: ${id}`);
      if (resolved && resolved !== page) throw new Error("这些节点不在同一页");
      resolved = page;
    }
    if (!resolved) throw new Error("缺少 page_id 或 ids");
    await usePage(figma, resolved);
    return;
  }
  throw new Error("缺少 page_id 或 ids");
}

function createdId(result: unknown): string | null {
  if (!result || typeof result !== "object" || !("id" in result)) return null;
  const id = (result as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}
