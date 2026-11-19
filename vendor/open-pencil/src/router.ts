import { createRouter, createWebHistory } from "vue-router";

import { useUiManageAuth } from "@/app/integrations/ui-manage/auth";
import { isEmbeddedFrame } from "@/app/integrations/ui-manage/mode";

import DesignView from "./views/DesignView.vue";

const uiManageEmbed = import.meta.env.VITE_OPENPENCIL_UI_MANAGE === "1";

let embedSsoPromise: Promise<boolean> | null = null;

function stripHarnessSsoFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("harness_sso")) return;
  url.searchParams.delete("harness_sso");
  const search = url.searchParams.toString();
  const next = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

const EMBED_GATE_MESSAGE_KEY = "ui_manage_embed_gate_message";

export function takeEmbedGateMessage(): string {
  try {
    const message = sessionStorage.getItem(EMBED_GATE_MESSAGE_KEY) || "";
    sessionStorage.removeItem(EMBED_GATE_MESSAGE_KEY);
    return message;
  } catch {
    return "";
  }
}

function setEmbedGateMessage(message: string) {
  try {
    sessionStorage.setItem(EMBED_GATE_MESSAGE_KEY, message);
  } catch {
    /* ignore */
  }
}

async function ensureEmbedSso(): Promise<boolean> {
  if (!isEmbeddedFrame()) return true;
  if (!embedSsoPromise) {
    embedSsoPromise = (async () => {
      const auth = useUiManageAuth();
      if (!auth.ready.value) auth.loadFromStorage();

      const params = new URLSearchParams(window.location.search);
      const code = params.get("harness_sso")?.trim() ?? "";
      if (code) {
        try {
          await auth.exchangeSso(code);
          stripHarnessSsoFromUrl();
          return true;
        } catch (error) {
          stripHarnessSsoFromUrl();
          auth.clear();
          setEmbedGateMessage(
            error instanceof Error && error.message
              ? error.message
              : "请从 Harness Admin 打开"
          );
          return false;
        }
      }

      return auth.ensureSession();
    })();
  }
  return embedSsoPromise;
}

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
          path: "/harness-required",
          name: "ui-manage-harness-required",
          component: () =>
            import("@/app/integrations/ui-manage/HarnessGate.vue"),
          meta: { public: true, embedGate: true },
        },
        {
          path: "/designs",
          name: "ui-manage-designs",
          component: () =>
            import("@/app/integrations/ui-manage/DesignsView.vue"),
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

    const embedded = isEmbeddedFrame();

    if (embedded) {
      if (to.meta.share || to.name === "ui-manage-harness-required") {
        return true;
      }
      if (to.path === "/login") {
        return { path: "/harness-required" };
      }
      const ok = await ensureEmbedSso();
      if (!ok) {
        return { name: "ui-manage-harness-required" };
      }
      return true;
    }

    // Share preview is public + read-only; create/edit always need a live session.
    if (to.meta.public) {
      if (to.path === "/login" && (await auth.ensureSession())) {
        return { path: "/designs" };
      }
      if (to.name === "ui-manage-harness-required") {
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
