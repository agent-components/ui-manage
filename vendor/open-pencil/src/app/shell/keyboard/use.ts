import { useActiveElement } from "@vueuse/core";
import { computed } from "vue";

import { useEditorCommands } from "@open-pencil/vue/editor/commands";
import { useViewportKind } from "@open-pencil/vue/editor/viewport-kind";

import { useEditorStore } from "@/app/editor/active-store";
import {
  isUiManageEmbed,
  leaveUiManageEditor,
} from "@/app/integrations/ui-manage/mode";
import { createKeyboardActions } from "@/app/shell/keyboard/actions";
import { bindEditorClipboard } from "@/app/shell/keyboard/clipboard";
import { isInputElement } from "@/app/shell/keyboard/focus";
import { bindNudgeKeys } from "@/app/shell/keyboard/nudging";
import { registerKeyboardShortcuts } from "@/app/shell/keyboard/registry";
import { openFileDialog } from "@/app/shell/menu/use";
import { propertiesTab } from "@/app/shell/properties-tab";
import {
  closeTab,
  openNewFileTab,
  createTab,
  switchAdjacentTab,
  activeTab as activeTabRef,
} from "@/app/tabs";

export function useKeyboard() {
  const store = useEditorStore();
  const { isMobile } = useViewportKind();
  const { runCommand, setOpacityTarget } = useEditorCommands();
  const activeElement = useActiveElement({ triggerOnRemoval: true });
  const inputFocused = computed(() => isInputElement(activeElement.value));

  const actions = createKeyboardActions({
    store,
    activeTab: propertiesTab,
    isMobile,
    runCommand,
    setOpacityTarget,
  });

  bindEditorClipboard(store);
  bindNudgeKeys(store);

  registerKeyboardShortcuts({
    inputFocused,
    store,
    runCommand,
    actions,
    openFileDialog: () => {
      void openFileDialog();
    },
    closeActiveTab: () => {
      if (activeTabRef.value) void closeTab(activeTabRef.value.id);
    },
    createTab: () => {
      // ui-manage: 新建只走设计稿列表，不在编辑器里开第二份稿。
      if (isUiManageEmbed) leaveUiManageEditor();
      else createTab();
    },
    openNewFileTab: () => openNewFileTab(),
    switchAdjacentTab,
  });
}
