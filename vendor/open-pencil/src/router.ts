import { createRouter, createWebHistory } from "vue-router";

import { useUiManageAuth } from "@/app/integrations/ui-manage/auth";

import DesignView from "./views/DesignView.vue";

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
          meta: { auth: true },
        },
        {
          path: "/tokens",
          name: "ui-manage-tokens",
          component: () =>
            import("@/app/integrations/ui-manage/TokensView.vue"),
          meta: { auth: true },
        },
        {
          path: "/designs/:id",
          name: "ui-manage-design",
          component: DesignView,
          props: true,
          meta: { auth: true },
        },
        {
          path: "/share/:token",
          name: "ui-manage-share",
          component: DesignView,
          props: true,
          meta: { public: true, share: true },
        },
        { path: "/", redirect: "/designs" },
      ]
    : [{ path: "/", component: DesignView }],
});

if (uiManageEmbed) {
  router.beforeEach(async (to) => {
    const auth = useUiManageAuth();
    if (!auth.ready.value) auth.loadFromStorage();

    // Share preview is public + read-only; create/edit always need a live session.
    if (to.meta.public) {
      if (to.path === "/login" && (await auth.ensureSession())) {
        return { path: "/designs" };
      }
      return true;
    }

    if (!(await auth.ensureSession())) {
      return { path: "/login", query: { redirect: to.fullPath } };
    }
    return true;
  });
}

export default router;
