import {
  defineEventHandler,
  getHeader,
  sendWebResponse,
  toWebRequest,
} from "h3";
import { requireApiTokenUser } from "../utils/auth";
import { readDocHeaders, resolveMcpDesign } from "../utils/mcp-design";
import { handleMcpHttpRequest } from "../utils/mcp-server";

function requestOrigin(event: Parameters<typeof getHeader>[0]): string {
  const forwardedHost = getHeader(event, "x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = getHeader(event, "x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedHost) {
    return `${forwardedProto || "http"}://${forwardedHost}`;
  }
  return new URL(toWebRequest(event).url).origin;
}

export default defineEventHandler(async (event) => {
  const user = await requireApiTokenUser(event);
  const { docId, docName } = readDocHeaders(event);
  const design = await resolveMcpDesign(user, docId, docName);

  const request = toWebRequest(event);
  const response = await handleMcpHttpRequest(request, {
    user,
    design,
    origin: requestOrigin(event),
  });
  return sendWebResponse(event, response);
});
