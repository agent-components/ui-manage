import { defineEventHandler, getRequestHeader, setResponseHeaders } from "h3";

const ALLOW = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://localhost:5174",
]);

export default defineEventHandler((event) => {
  const origin = getRequestHeader(event, "origin") || "";
  if (!ALLOW.has(origin)) return;

  setResponseHeaders(event, {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, If-Match, If-None-Match, x-doc-id, x-doc-name, mcp-session-id, mcp-protocol-version",
    "Access-Control-Expose-Headers": "ETag",
    "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
  });

  if (event.method === "OPTIONS") {
    event.node.res.statusCode = 204;
    event.node.res.end();
  }
});
