import { defineEventHandler } from "h3";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return {
    id: user.id,
    account: user.account,
    displayName: user.displayName,
  };
});
