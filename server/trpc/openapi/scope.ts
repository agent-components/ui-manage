import type { FigmaAPI } from "@open-pencil/core/figma-api";
import { findPageId } from "@open-pencil/core/io";

/**
 * 画布工具来自编辑器，内部会读 figma.currentPage。
 * HTTP 不保留这一次调用的页面，所以读页必须带 page_id，新建图层必须带 parent_id。
 */

const PAGE_FIELD = {
  type: "string",
  description: "页面节点 ID。服务不记住当前页，每次调用都要带上。",
} as const;

const PARENT_FIELD = {
  type: "string",
  description:
    "父节点 ID，可以是页面，也可以是页面里的容器。服务不记住当前页。",
} as const;

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

const DESCRIPTIONS: Record<string, string> = {
  list_pages: "列出设计稿里的全部页面，返回每页的 id 和 name。没有当前页。",
  get_page_tree:
    "读取页面或节点的层级，只含 id、type、name、尺寸，文本节点带文字。传 page_id 读整页；传 root_id 只读该节点及其子树。不传 root_id 时必须传 page_id。可用 depth、node_types 缩小结果。节点详情用 get_node。",
  find_nodes: "在指定页面里按名称和类型查找节点。必须传 page_id。",
  page_bounds: "计算指定页面上全部顶层对象的包围盒。必须传 page_id。",
  export_svg:
    "把节点导出成 SVG 字符串。传 ids 导出这些节点；不传 ids 时必须传 page_id，导出该页全部顶层节点。",
  export_png:
    "把节点导出成 PNG，用来肉眼核对画稿。传 ids 导出这些节点；不传 ids 时必须传 page_id，导出该页全部顶层节点。图片在 image 内容里返回，文字里是宽、高、缩放和字节数。",
  create_instance:
    "创建一个组件实例。必须传 parent_id，指定放在哪个页面或容器里。",
};

export function scopeDescription(
  name: string,
  description: string | undefined
): string | undefined {
  return DESCRIPTIONS[name] ?? description;
}

export function scopeInputSchema(
  name: string,
  schema: Record<string, unknown>
): Record<string, unknown> {
  if (name === "find_nodes" || name === "page_bounds") {
    return withField(schema, "page_id", PAGE_FIELD, true);
  }
  if (name === "get_page_tree") {
    return withField(
      schema,
      "page_id",
      {
        ...PAGE_FIELD,
        description: "页面节点 ID。不传 root_id 时必填。服务不记住当前页。",
      },
      false
    );
  }
  if (name === "export_svg" || name === "export_png") {
    const described = patchProperty(
      schema,
      "ids",
      "要导出的节点 ID。不传则必须同时传 page_id，导出该页全部顶层节点。"
    );
    return withField(
      described,
      "page_id",
      {
        ...PAGE_FIELD,
        description:
          "页面节点 ID。不传 ids 时必填，导出该页全部顶层节点。服务不记住当前页。",
      },
      false
    );
  }
  if (NEEDS_PARENT.has(name)) {
    return withField(schema, "parent_id", PARENT_FIELD, name !== "render");
  }
  return schema;
}

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

function schemaProperties(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const properties = schema.properties;
  if (
    properties &&
    typeof properties === "object" &&
    !Array.isArray(properties)
  ) {
    return { ...(properties as Record<string, unknown>) };
  }
  return {};
}

function schemaRequired(schema: Record<string, unknown>): string[] {
  return Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === "string")
    : [];
}

function withField(
  schema: Record<string, unknown>,
  name: string,
  field: { type: string; description: string },
  required: boolean
): Record<string, unknown> {
  const properties = schemaProperties(schema);
  const existing = properties[name];
  properties[name] =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? {
          ...(existing as Record<string, unknown>),
          description: field.description,
        }
      : { ...field };
  const requiredNames = new Set(schemaRequired(schema));
  if (required) requiredNames.add(name);
  return {
    ...schema,
    type: "object",
    properties,
    required: [...requiredNames],
  };
}

function patchProperty(
  schema: Record<string, unknown>,
  name: string,
  description: string
): Record<string, unknown> {
  const properties = schemaProperties(schema);
  const existing = properties[name];
  if (!existing || typeof existing !== "object" || Array.isArray(existing))
    return schema;
  properties[name] = { ...(existing as Record<string, unknown>), description };
  return { ...schema, properties };
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
