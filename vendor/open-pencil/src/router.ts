import { createRouter, createWebHistory } from "vue-router";

import { useUiManageAuth } from "@/app/integrations/ui-manage/auth";

import WorkspaceView from "./views/WorkspaceView.vue";

const uiManageEmbed = import.meta.env.VITE_OPENPENCIL_UI_MANAGE === "1";

const router = createRouter({
  history: createWebHistory(),
  routes: uiManageEmbed
    ? [
        {
          path: "/login",
          name: "ui-manage-login",
          component: () => import("@/app/integrations/ui-manage/LoginView.vue"),
          meta: { public: true },
        },
        {
          path: "/designs",
          name: "ui-manage-designs",
          component: () =>
            import("@/app/integrations/ui-manage/DesignsView.vue"),
        },
        {
          path: "/designs/:id",
          name: "ui-manage-design",
          component: WorkspaceView,
          props: true,
        },
        {
          path: "/share/:token",
          name: "ui-manage-share",
          component: WorkspaceView,
          props: true,
          meta: { public: true, share: true },
        },
        { path: "/", redirect: "/designs" },
      ]
    : [
        { path: "/", component: WorkspaceView },
      ],
});

if (uiManageEmbed) {
  router.beforeEach((to) => {
    const auth = useUiManageAuth();
    if (!auth.ready.value) auth.loadFromStorage();
    if (to.meta.public) {
      if (auth.token.value && to.path === "/login") return { path: "/designs" };
      return true;
    }
    if (!auth.token.value) {
      return { path: "/login", query: { redirect: to.fullPath } };
    }
    return true;
  });
}

export default router;
