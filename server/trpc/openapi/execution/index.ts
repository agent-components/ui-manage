import type { AuthUser } from "../../auth/session";
import { isDesignTool, isPngTool, isShareTool } from "../definitions";
import { runCanvasTool } from "./canvas";
import { runDesignTool } from "./entities";
import { runPngTool } from "./png";
import { runShareTool } from "./share";
import { resolveMcpDesign, takeDocParams } from "./target";

export type ToolContext = {
  user: AuthUser;
  origin: string;
};

/** 执行一个对外工具：先看定义里属于哪一类，再走对应的执行分支。 */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  if (isDesignTool(name)) return runDesignTool(name, args, ctx.user);

  const { docId, docName, toolArgs } = takeDocParams(args);
  const design = await resolveMcpDesign(ctx.user, docId, docName);

  if (isShareTool(name)) return runShareTool(name, design, ctx.user, ctx.origin);
  if (isPngTool(name)) return runPngTool(design, toolArgs);
  return runCanvasTool(name, design, toolArgs);
}
