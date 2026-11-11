import { defineEventHandler, sendWebResponse, toWebRequest } from "h3";
import { requireApiTokenUser } from "../utils/auth";
import { readDocHeaders, resolveMcpDesign } from "../utils/mcp-design";
import { handleMcpHttpRequest } from "../utils/mcp-server";

export default defineEventHandler(async (event) => {
  const user = await requireApiTokenUser(event);
  const { docId, docName } = readDocHeaders(event);
  const design = await resolveMcpDesign(user, docId, docName);

  const request = toWebRequest(event);
  const response = await handleMcpHttpRequest(request, { user, design });
  return sendWebResponse(event, response);
});
