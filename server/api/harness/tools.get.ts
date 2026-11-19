import { defineEventHandler } from "h3";
import { listHarnessTools } from "../../utils/openapi-tools";

export default defineEventHandler(() => {
  return { tools: listHarnessTools() };
});
