import { computed, inject, provide, proxyRefs } from "vue";
import type { InjectionKey, ShallowUnwrapRef } from "vue";
import IconFilePlus from "~icons/lucide/file-plus";
import IconFolderOpen from "~icons/lucide/folder-open";
import IconImageDown from "~icons/lucide/image-down";
import IconSave from "~icons/lucide/save";
import IconZoomIn from "~icons/lucide/zoom-in";

import { useEditorCommands } from "@open-pencil/vue/editor/commands";
import { useI18n } from "@open-pencil/vue/i18n";

import {
  useActiveEditorStoreRef,
  useEditorStore,
} from "@/app/editor/active-store";
import { useDisplayIdentity } from "@/app/identity";
import { saveActiveToUiManage } from "@/app/integrations/ui-manage/bridge";
import { isUiManageEmbed } from "@/app/integrations/ui-manage/mode";
import {
  presenceOf,
  renameAgent as renameLocalAgent,
} from "@/app/presence/registry";
import type { FollowTarget } from "@/app/presence/types";
import { openFileDialog } from "@/app/shell/menu/use";
import { createTab } from "@/app/tabs";
import { toolIcons } from "@/components/icons";
import { presenceRows } from "@/components/presence/rows";
import type { ToolbarActionItem } from "@/components/toolbar/types";

type MenuAction = ToolbarActionItem;

function createMobileHudContext() {
  const store = useEditorStore();
  const identity = useDisplayIdentity();
  const { common, collaboration } = useI18n();
  const { getCommand } = useEditorCommands();

  const collabState = computed(() => ({
    inRoom: false,
    canLeave: false,
    roomId: null as string | null,
    status: null,
    peers: [] as never[],
    localName: identity.name.value,
    localColor: identity.color,
    hasChosenName: identity.hasChosenName.value,
  }));
  const following = computed(() => null);
  const tabStore = useActiveEditorStoreRef();
  const people = computed(() => {
    const own = tabStore.value;
    return presenceRows(
      {
        name: collabState.value.localName,
        color: collabState.value.localColor,
        agents: own ? presenceOf(own).agents.value : [],
      },
      [],
      (pageId) => own?.graph.getNode(pageId)?.name
    );
  });
  const peopleLabel = computed(() => common.value.you);
  const activeToolIcon = computed(() => toolIcons[store.state.activeTool]);
  const actionToast = computed(() => store.state.actionToast);

  const menuItems: MenuAction[] = [
    {
      icon: IconFilePlus,
      label: "New",
      action: () => createTab(),
    },
    {
      icon: IconFolderOpen,
      label: "Open",
      action: () => void openFileDialog(),
    },
    {
      icon: IconSave,
      label: "Save",
      action: () => {
        if (isUiManageEmbed) void saveActiveToUiManage();
        else void store.saveFigFile();
      },
    },
    {
      icon: IconImageDown,
      label: "Export",
      action: () => void store.exportSelection(1, "png"),
    },
    {
      icon: IconZoomIn,
      label: "Zoom to fit",
      action: () => getCommand("view.zoomFit").run(),
    },
  ];

  function undo() {
    getCommand("edit.undo").run();
  }

  function redo() {
    getCommand("edit.redo").run();
  }

  const statusText = computed(() => "");

  function share() {}

  function disconnect() {}

  function follow(_target: FollowTarget | null) {}

  function renameAgent(agentId: string, name: string) {
    if (tabStore.value) renameLocalAgent(tabStore.value, agentId, name);
  }

  return {
    store,
    common,
    messages: collaboration,
    collabState,
    people,
    peopleLabel,
    following,
    statusText,
    activeToolIcon,
    actionToast,
    menuItems,
    undo,
    redo,
    share,
    disconnect,
    follow,
    renameAgent,
  };
}

export type MobileHudContext = ShallowUnwrapRef<
  ReturnType<typeof createMobileHudContext>
>;

const MOBILE_HUD_KEY: InjectionKey<MobileHudContext> =
  Symbol("MobileHudContext");

export function provideMobileHud() {
  const ctx = proxyRefs(createMobileHudContext());
  provide(MOBILE_HUD_KEY, ctx);
  return ctx;
}

export function useMobileHudContext(): MobileHudContext {
  const ctx = inject(MOBILE_HUD_KEY);
  if (!ctx) throw new Error("MobileHud context missing");
  return ctx;
}
