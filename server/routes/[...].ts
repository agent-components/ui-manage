import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createError, defineEventHandler, getRequestURL, setHeader } from "h3";

const RESERVED = ["/api", "/mcp"];

function isReserved(pathname: string): boolean {
  return RESERVED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function hasFileExtension(pathname: string): boolean {
  const base = pathname.slice(pathname.lastIndexOf("/") + 1);
  return base.includes(".");
}

function findIndexHtml(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = resolve(dir, "public/index.html");
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

let indexHtml: Buffer | undefined;
let indexPath: string | undefined;

export default defineEventHandler((event) => {
  if (event.method !== "GET" && event.method !== "HEAD") {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const { pathname } = getRequestURL(event);
  if (isReserved(pathname) || hasFileExtension(pathname)) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  if (!indexPath) indexPath = findIndexHtml();
  if (!indexPath) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  indexHtml ??= readFileSync(indexPath);
  setHeader(event, "content-type", "text/html; charset=utf-8");
  setHeader(event, "cache-control", "no-cache");
  if (event.method === "HEAD") return "";
  return indexHtml;
});
