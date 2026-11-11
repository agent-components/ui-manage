import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fontManager } from "@open-pencil/core/text";

let ready: Promise<void> | null = null;

function coreAssetsDir(): string {
  const require = createRequire(import.meta.url);
  return join(
    dirname(require.resolve("@open-pencil/core/package.json")),
    "assets"
  );
}

function bufferOf(file: string): ArrayBuffer {
  const bytes = readFileSync(join(coreAssetsDir(), file));
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
}

/** 预载 Inter，避免 MCP 改文字时去拉 Google Fonts。 */
export function ensureMcpFonts(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const variable = bufferOf("InterVariable.ttf");
      const semiBold = bufferOf("Inter-SemiBold.ttf");
      await fontManager.markLoaded("Inter", "Regular", variable, "bundled");
      await fontManager.markLoaded("Inter", "Medium", variable, "bundled");
      await fontManager.markLoaded("Inter", "Bold", variable, "bundled");
      await fontManager.markLoaded("Inter", "Semi Bold", semiBold, "bundled");
    })();
  }
  return ready;
}
