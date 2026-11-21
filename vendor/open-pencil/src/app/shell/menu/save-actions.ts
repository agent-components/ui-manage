import type { EditorStore } from "@/app/editor/active-store";
import { saveActiveToUiManage } from "@/app/integrations/ui-manage/bridge";
import {
  isUiManageEmbed,
  isUiManageSharePreview,
} from "@/app/integrations/ui-manage/mode";
import { toast } from "@/app/shell/ui";
import { showsDocument } from "@/app/tabs";

/** Runs a save only while a document is in front: Home and a New file tab have none. */
function onDocument(run: () => void): () => void {
  return () => {
    if (showsDocument()) run();
  };
}

export function createSaveMenuActions(store: EditorStore) {
  return {
    // ui-manage: Save writes the design via API (object storage). .fig download is Export only.
    save: onDocument(() => {
      if (isUiManageSharePreview()) {
        toast.info("分享链接为只读预览，无法保存");
        return;
      }
      if (isUiManageEmbed) void saveActiveToUiManage();
      else void store.saveFigFile();
    }),
    "save-as": onDocument(() => {
      if (isUiManageSharePreview()) {
        toast.info("分享链接为只读预览，无法保存");
        return;
      }
      if (isUiManageEmbed) {
        toast.info(
          "请使用「导出选区 → .fig」下载文件；⌘/Ctrl+S 会保存到设计稿"
        );
        return;
      }
      void store.saveFigFileAs();
    }),
    "save-to": onDocument(() => {
      // ui-manage: Save To dialog removed — use ⌘/Ctrl+S / API bridge.
      if (isUiManageEmbed) return;
    }),
  };
}
