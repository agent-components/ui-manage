import { authRouter } from "./auth/router";
import { designsRouter } from "./designs/router";
import { harnessRouter } from "./harness/router";
import { librariesRouter } from "./libraries/router";
import { shareRouter } from "./share/router";
import { router } from "./trpc";

export const appRouter = router({
  auth: authRouter,
  designs: designsRouter,
  share: shareRouter,
  libraries: librariesRouter,
  harness: harnessRouter,
});

export type AppRouter = typeof appRouter;
