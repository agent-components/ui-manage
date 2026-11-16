import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { faceStyleKey, parseFontStyle } from "@open-pencil/scene-graph/font-style";
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
let bundledFace: ArrayBuffer | null = null;

/**
 * 改字前备好内置西文字体，并关掉在线字体。
 * 服务器不挑字体、也不去网上拉字体；AI 点名的任何字体都用这份内置字接住，工具不因此失败。
 */
export function ensureMcpFonts(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      fontManager.setOnlineFontProviders({
        google: false,
        fontsource: false,
        bunny: false,
        fontshare: false,
      });
      const variable = bufferOf(INTER_VARIABLE);
      const semiBold = bufferOf(INTER_SEMIBOLD);
      bundledFace = variable;
      await fontManager.markLoaded("Inter", "Regular", variable, "bundled");
      await fontManager.markLoaded("Inter", "Medium", variable, "bundled");
      await fontManager.markLoaded("Inter", "Bold", variable, "bundled");
      await fontManager.markLoaded("Inter", "Semi Bold", semiBold, "bundled");
    })().catch((error: unknown) => {
      ready = null;
      bundledFace = null;
      throw error;
    });
  }
  return ready;
}

/** 让这次调用要的字体算作已加载。没有对应文件也不报错。 */
export async function acceptRequestedFont(font: {
  family?: string;
  style?: string;
}): Promise<void> {
  await ensureMcpFonts();
  const family = font.family?.trim();
  const data = bundledFace;
  if (!family || !data) return;
  const style = font.style?.trim() || "Regular";
  const parsed = parseFontStyle(style);
  const key = faceStyleKey({
    fontWeight: parsed.weight,
    italic: parsed.italic,
    fontStyle: style,
  });
  if (!fontManager.isStyleLoaded(family, key)) {
    await fontManager.markLoaded(family, key, data, "bundled");
  }
}
