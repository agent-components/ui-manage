import type { ExportImageOptions, FigmaAPI } from "@open-pencil/core/figma-api";
import { findPageId } from "@open-pencil/core/io";
import { headlessRenderNodes } from "@open-pencil/core/io/formats/raster";
import { exportImage, toolNumber } from "@open-pencil/core/tools";
import { toJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";

export const EXPORT_PNG_TOOL = "export_png";

const exportPngInput = v.strictObject({
  ids: v.optional(
    v.pipe(
      v.array(v.string()),
      v.minLength(1),
      v.description(
        "要导出的节点 ID。不传则必须同时传 page_id，导出该页全部顶层节点。"
      )
    )
  ),
  scale: v.optional(
    toolNumber(
      v.pipe(
        v.number(),
        v.minValue(0.1),
        v.maxValue(4),
        v.description("导出倍率，会先按这个放大，再受 maxEdge 限制。默认 1。")
      )
    ),
    1
  ),
  maxEdge: v.optional(
    toolNumber(
      v.pipe(
        v.number(),
        v.minValue(64),
        v.maxValue(4096),
        v.description(
          "输出宽或高的像素上限。保持比例，且不会比原图更大。默认 1280。"
        )
      )
    ),
    1280
  ),
});

function exportPngInputSchema(): Record<string, unknown> {
  const schema = toJsonSchema(exportPngInput, {
    errorMode: "ignore",
    typeMode: "force" as "ignore",
  }) as Record<string, unknown>;
  return {
    type: "object",
    ...schema,
  };
}

export const exportPngTool = {
  name: EXPORT_PNG_TOOL,
  description:
    "把节点导出成 PNG，用来肉眼核对画稿。传 ids 导出这些节点；不传 ids 时必须传 page_id，导出该页全部顶层节点。图片在 image 内容里返回，文字里是宽、高、缩放和字节数。",
  inputSchema: exportPngInputSchema(),
} as const;

export function isExportPngTool(name: string): boolean {
  return name === EXPORT_PNG_TOOL;
}

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
      `Invalid arguments for ${EXPORT_PNG_TOOL}:\n${v.summarize(parsed.issues)}`
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
