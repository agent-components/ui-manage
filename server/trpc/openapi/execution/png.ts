import type { ExportImageOptions, FigmaAPI } from "@open-pencil/core/figma-api";
import { findPageId } from "@open-pencil/core/io";
import { headlessRenderNodes } from "@open-pencil/core/io/formats/raster";
import { exportImage, toolNumber } from "@open-pencil/core/tools";
import * as v from "valibot";
import { withMcpDocument } from "./document";
import { ensureMcpFonts } from "./fonts";
import { prepareScope } from "./scope";
import type { McpDesign } from "./target";

/** export_png 的参数。说明写在 ../definitions/png.ts，这里只管校验。 */
const exportPngInput = v.strictObject({
  ids: v.optional(v.pipe(v.array(v.string()), v.minLength(1))),
  scale: v.optional(
    toolNumber(v.pipe(v.number(), v.minValue(0.1), v.maxValue(4))),
    1
  ),
  maxEdge: v.optional(
    toolNumber(v.pipe(v.number(), v.minValue(64), v.maxValue(4096))),
    1280
  ),
});

/** 进程里只有一个 CanvasKit 渲染器，导出必须串行。 */
let renderQueue: Promise<unknown> = Promise.resolve();

function serializeRender<T>(run: () => Promise<T>): Promise<T> {
  const next = renderQueue.then(run, run);
  renderQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function attachPngExport(figma: FigmaAPI): void {
  figma.exportImage = (nodeIds, options: ExportImageOptions = {}) =>
    serializeRender(() => {
      const pageId =
        options.pageId ??
        (nodeIds[0] ? findPageId(figma.graph, nodeIds[0]) : null) ??
        figma.currentPageId;
      return headlessRenderNodes(figma.graph, pageId, nodeIds, {
        scale: options.scale,
        format: options.format ?? "PNG",
        quality: options.quality,
        useAbsoluteBounds: options.useAbsoluteBounds,
      });
    });
}

type PngPayload = {
  mimeType: "image/png";
  base64: string;
  byteLength: number;
  width: number;
  height: number;
  scale: number;
};

function isPngPayload(value: unknown): value is PngPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.mimeType === "image/png" &&
    typeof record.base64 === "string" &&
    typeof record.byteLength === "number" &&
    typeof record.width === "number" &&
    typeof record.height === "number" &&
    typeof record.scale === "number"
  );
}

export async function runExportPng(
  figma: FigmaAPI,
  args: Record<string, unknown>
): Promise<PngPayload | { error: string }> {
  const parsed = v.safeParse(exportPngInput, args);
  if (!parsed.success) {
    throw new Error(
      `Invalid arguments for export_png:\n${v.summarize(parsed.issues)}`
    );
  }
  attachPngExport(figma);
  const result = await exportImage.execute(figma, {
    ...parsed.output,
    format: "PNG",
  });
  if (isPngPayload(result)) return result;
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return { error: result.error };
  }
  return { error: "PNG export failed" };
}

/** 执行 export_png：切页、备字，再把指定节点渲染成 PNG。 */
export async function runPngTool(
  design: McpDesign,
  args: Record<string, unknown>
): Promise<PngPayload | { error: string }> {
  return withMcpDocument(design, false, async (figma) => {
    const prepared = await prepareScope(figma, "export_png", args);
    await ensureMcpFonts();
    return runExportPng(figma, prepared.args);
  });
}

export function exportPngToolResponse(result: PngPayload | { error: string }) {
  if ("error" in result) {
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result, null, 2) },
      ],
    };
  }
  const { base64, ...meta } = result;
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(meta, null, 2) },
      { type: "image" as const, data: base64, mimeType: "image/png" as const },
    ],
  };
}
