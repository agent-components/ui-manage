import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createError, defineEventHandler, getRequestURL, setHeader } from "h3";

const RESERVED = ["/api"];

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
  const candidates: string[] = [];
  const seen = new Set<string>();

  function add(path: string) {
    if (seen.has(path)) return;
    seen.add(path);
    candidates.push(path);
  }

  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i += 1) {
    add(resolve(dir, "public/index.html"));
    add(resolve(dir, ".output/public/index.html"));
    add(resolve(dir, "vendor/open-pencil/dist/index.html"));
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  add(resolve(process.cwd(), "public/index.html"));
  add(resolve(process.cwd(), ".output/public/index.html"));
  add(resolve(process.cwd(), "vendor/open-pencil/dist/index.html"));

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
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
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message:
        "找不到前端 index.html。开发请用 pnpm dev（Vite :5173）；发布请先 pnpm pack。",
    });
  }

  indexHtml ??= readFileSync(indexPath);
  setHeader(event, "content-type", "text/html; charset=utf-8");
  setHeader(event, "cache-control", "no-cache");
  if (event.method === "HEAD") return "";
  return indexHtml;
});
