import { decodeUtf8Header } from "./design";

/**
 * 对外工具可以事先用请求头绑住这些参数。
 * 列表里就不再暴露它们；调用 OpenAPI 时再从请求头填回。
 */
const HEADER_TO_PARAM: Record<string, string> = {
  docid: "docId",
  "doc-id": "docId",
  "x-doc-id": "docId",
  docname: "docName",
  "doc-name": "docName",
  "x-doc-name": "docName",
  page_id: "page_id",
  "page-id": "page_id",
  "x-page-id": "page_id",
  parent_id: "parent_id",
  "parent-id": "parent_id",
  "x-parent-id": "parent_id",
};

export function boundParamsFromHeaders(
  headers: Headers
): Record<string, string> {
  const found: Record<string, string> = {};
  headers.forEach((value, name) => {
    const param = HEADER_TO_PARAM[name.toLowerCase()];
    if (!param) return;
    const text = decodeUtf8Header(value.trim());
    if (!text) return;
    found[param] = text;
  });
  return found;
}

function schemaProperties(
  schema: Record<string, unknown> | undefined
): Record<string, unknown> | null {
  const properties = schema?.properties;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return null;
  }
  return properties as Record<string, unknown>;
}

/** 请求头里已经给出的参数，从对外工具的 inputSchema 里拿掉。 */
export function omitBoundParams<
  T extends { inputSchema?: Record<string, unknown> }
>(tools: T[], headers: Headers): T[] {
  const keys = Object.keys(boundParamsFromHeaders(headers));
  if (keys.length === 0) return tools;
  const drop = new Set(keys);
  return tools.map((tool) => {
    const properties = schemaProperties(tool.inputSchema);
    if (!properties || !keys.some((key) => key in properties)) return tool;
    const nextProperties = { ...properties };
    for (const key of drop) delete nextProperties[key];
    const required = Array.isArray(tool.inputSchema?.required)
      ? tool.inputSchema.required.filter(
          (item): item is string => typeof item === "string" && !drop.has(item)
        )
      : tool.inputSchema?.required;
    return {
      ...tool,
      inputSchema: {
        ...tool.inputSchema,
        properties: nextProperties,
        required,
      },
    };
  });
}

/**
 * 只填这个工具 schema 里本来就有的参数。
 * 避免把 page_id 塞进并不接收它的工具，严格校验会因此失败。
 */
export function fillBoundParams(
  args: Record<string, unknown>,
  headers: Headers,
  schema: Record<string, unknown> | undefined
): Record<string, unknown> {
  const bound = boundParamsFromHeaders(headers);
  const properties = schemaProperties(schema);
  if (!properties) return args;
  const next = { ...args };
  for (const [key, value] of Object.entries(bound)) {
    if (!(key in properties)) continue;
    next[key] = value;
  }
  return next;
}
