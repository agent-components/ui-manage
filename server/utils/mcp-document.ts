import { FigmaAPI } from "@open-pencil/core/figma-api";
import { exportFigFile, parseFigFile } from "@open-pencil/core/io/formats/fig";
import { SceneGraph } from "@open-pencil/scene-graph";
import type { McpDesign } from "./mcp-design";
import { ensureMcpFonts } from "./mcp-fonts";
import { getDesignObject, putDesignObject } from "./s3";
import { prisma } from "./prisma";

const locks = new Map<string, Promise<unknown>>();

async function withDesignLock<T>(
  designId: string,
  run: () => Promise<T>
): Promise<T> {
  const prev = locks.get(designId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = prev.then(
    () => gate,
    () => gate
  );
  locks.set(designId, tail);
  await prev.catch(() => undefined);
  try {
    return await run();
  } finally {
    release();
    if (locks.get(designId) === tail) locks.delete(designId);
  }
}

async function loadGraph(design: McpDesign): Promise<SceneGraph> {
  try {
    const bytes = await getDesignObject(design.objectKey);
    if (!bytes.byteLength) return new SceneGraph();
    const copy = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );
    return parseFigFile(copy, { populate: "all" });
  } catch (error: unknown) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;
    if (statusCode === 404) return new SceneGraph();
    throw error;
  }
}

function createFigma(graph: SceneGraph): FigmaAPI {
  const figma = new FigmaAPI(graph);
  // 字体已在 ensureMcpFonts 中 markLoaded；阻止再去拉远程字体。
  figma.loadFontAsync = async () => {};
  return figma;
}

export async function withMcpDocument<T>(
  design: McpDesign,
  mutates: boolean,
  run: (figma: FigmaAPI) => Promise<T> | T
): Promise<T> {
  await ensureMcpFonts();
  return withDesignLock(design.id, async () => {
    const graph = await loadGraph(design);
    const figma = createFigma(graph);
    const result = await run(figma);
    if (mutates) {
      const bytes = await exportFigFile(graph, { documentName: design.name });
      await putDesignObject(design.objectKey, bytes);
      await prisma.design.update({
        where: { id: design.id },
        data: { byteSize: bytes.byteLength },
      });
    }
    return result;
  });
}
