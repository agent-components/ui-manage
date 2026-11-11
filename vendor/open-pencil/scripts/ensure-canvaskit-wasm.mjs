import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(
  root,
  "node_modules/@open-pencil/canvaskit/dist/canvaskit.wasm"
);
const dest = resolve(root, "public/canvaskit.wasm");

if (!existsSync(src)) {
  console.warn("[ensure-canvaskit-wasm] skipped: package wasm missing at", src);
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[ensure-canvaskit-wasm] wrote", dest);
