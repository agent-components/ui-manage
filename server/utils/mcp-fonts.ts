import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fontManager } from "@open-pencil/core/text";

const require = createRequire(import.meta.url);

const INTER_VARIABLE = "@open-pencil/core/assets/InterVariable.ttf";
const INTER_SEMIBOLD = "@open-pencil/core/assets/Inter-SemiBold.ttf";

function bufferOf(specifier: string): ArrayBuffer {
  const bytes = readFileSync(require.resolve(specifier));
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
}

let ready: Promise<void> | null = null;

/** 改字和导出 PNG 前预载 Inter，避免排版时去拉 Google Fonts。只读工具不调用。 */
export function ensureMcpFonts(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const variable = bufferOf(INTER_VARIABLE);
      const semiBold = bufferOf(INTER_SEMIBOLD);
      await fontManager.markLoaded("Inter", "Regular", variable, "bundled");
      await fontManager.markLoaded("Inter", "Medium", variable, "bundled");
      await fontManager.markLoaded("Inter", "Bold", variable, "bundled");
      await fontManager.markLoaded("Inter", "Semi Bold", semiBold, "bundled");
    })().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
