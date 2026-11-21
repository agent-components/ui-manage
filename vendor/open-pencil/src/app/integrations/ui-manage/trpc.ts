import { createTRPCClient, httpBatchLink } from "@trpc/client";

import type { AppRouter } from "@ui-manage/server/router";

import { authHeaderRecord } from "./session";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers: authHeaderRecord,
    }),
  ],
});
