import "./load-env.ts";
import { handleMcp } from "./trpc/openapi/mcp.ts";

const token = process.env.TOKEN ?? "";
const origin = "http://127.0.0.1:3001";

async function call(body: unknown) {
  const res = await handleMcp(
    new Request(`${origin}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }),
    origin
  );
  const text = await res.text();
  console.log("---", res.status, text.slice(0, 400));
}

await call({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "check", version: "0" },
  },
});
await call({ jsonrpc: "2.0", method: "notifications/initialized" });

const listed = await handleMcp(
  new Request(`${origin}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  }),
  origin
);
const json = (await listed.json()) as {
  result: {
    tools: Array<{
      name: string;
      inputSchema: { required?: string[] };
    }>;
  };
};
const tree = json.result.tools.find((tool) => tool.name === "get_page_tree");
const list = json.result.tools.find((tool) => tool.name === "list_designs");
console.log("tools", json.result.tools.length);
console.log("tree required", tree?.inputSchema.required);
console.log("list required", list?.inputSchema.required ?? null);
console.log("mentions header", JSON.stringify(tree).includes("x-doc"));

await call({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "get_page_tree", arguments: {} },
});
await call({
  jsonrpc: "2.0",
  id: 4,
  method: "tools/call",
  params: {
    name: "get_page_tree",
    arguments: { docId: process.env.DOC_ID, docName: process.env.DOC_NAME },
  },
});
