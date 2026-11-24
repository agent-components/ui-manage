import type { AuthUser } from "../../auth/session";
import {
  ensureShareToken,
  readShareToken,
  shareLinkView,
} from "../../share/links";
import type { McpDesign } from "./target";

/** create_share_link 会顺手建链接，get_share_link 只读不建。 */
export async function runShareTool(
  name: string,
  design: McpDesign,
  user: AuthUser,
  origin: string
): Promise<unknown> {
  const token =
    name === "create_share_link"
      ? await ensureShareToken(design.id, user.account)
      : await readShareToken(design.id, user.account);
  return shareLinkView(token, origin);
}
