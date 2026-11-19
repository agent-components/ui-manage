import { defineEventHandler } from "h3";

export default defineEventHandler(() => {
  return {
    menus: [
      { key: "designs", label: "设计文件", path: "/designs" },
    ],
  };
});
