export function mcpServerKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "ui-manage";
}

/** Cursor mcp.json 可用的 Streamable HTTP 配置。 */
export function buildMcpConfigString(opts: {
  name: string;
  token: string;
  mcpUrl: string;
}): string {
  const key = mcpServerKey(opts.name);
  return JSON.stringify(
    {
      mcpServers: {
        [key]: {
          url: opts.mcpUrl,
          headers: {
            Authorization: `Bearer ${opts.token}`,
            "x-doc-id": "<设计稿UUID>",
            "x-doc-name": "<设计稿名称>",
          },
        },
      },
    },
    null,
    2
  );
}
