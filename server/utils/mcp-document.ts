import { FigmaAPI } from "@open-pencil/core/figma-api";
import { exportFigFile, parseFigFile } from "@open-pencil/core/io/formats/fig";
import { SceneGraph } from "@open-pencil/scene-graph";
import type { McpDesign } from "./mcp-design";
import { ensureMcpFonts } from "./mcp-fonts";
import { getDesignObject, putDesignObject } from "./s3";
import { prisma } from "./prisma";

/** 同一设计稿复用内存会话，保留 currentPage（switch_page 为 view mutation，不落盘）。 */
type DesignSession = {
  designId: string;
  objectKey: string;
  name: string;
  graph: SceneGraph;
  figma: FigmaAPI;
  lastUsed: number;
};

const sessions = new Map<string, DesignSession>();
const locks = new Map<string, Promise<unknown>>();
const SESSION_TTL_MS = 30 * 60 * 1000;

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

function pruneSessions(now = Date.now()) {
  for (const [id, session] of sessions) {
    if (now - session.lastUsed > SESSION_TTL_MS) sessions.delete(id);
  }
}

async function getSession(design: McpDesign): Promise<DesignSession> {
  pruneSessions();
  const existing = sessions.get(design.id);
  if (
    existing &&
    existing.objectKey === design.objectKey &&
    existing.name === design.name
  ) {
    existing.lastUsed = Date.now();
    return existing;
  }

  const graph = await loadGraph(design);
  const session: DesignSession = {
    designId: design.id,
    objectKey: design.objectKey,
    name: design.name,
    graph,
    figma: createFigma(graph),
    lastUsed: Date.now(),
  };
  sessions.set(design.id, session);
  return session;
}

export function dropMcpDocumentSession(designId: string) {
  sessions.delete(designId);
}

export async function withMcpDocument<T>(
  design: McpDesign,
  mutates: boolean,
  run: (figma: FigmaAPI) => Promise<T> | T
): Promise<T> {
  await ensureMcpFonts();
  return withDesignLock(design.id, async () => {
    const session = await getSession(design);
    const result = await run(session.figma);
    session.lastUsed = Date.now();
    if (mutates) {
      const bytes = await exportFigFile(session.graph, {
        documentName: design.name,
      });
      await putDesignObject(design.objectKey, bytes);
      await prisma.design.update({
        where: { id: design.id },
        data: { byteSize: bytes.byteLength },
      });
    }
    return result;
  });
}
