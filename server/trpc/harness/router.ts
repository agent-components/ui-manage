import { publicProcedure, router } from "../trpc";

export const harnessRouter = router({
  menus: publicProcedure.query(() => ({
    menus: [{ key: "designs", label: "设计文件", path: "/designs" }],
  })),
  tools: publicProcedure.query(async () => {
    const { listHarnessTools } = await import("../openapi/definitions");
    return { tools: listHarnessTools() };
  }),
});
