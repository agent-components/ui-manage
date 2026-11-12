import type { SnappingPreferences } from "@open-pencil/core";

import { getTabsSnapshot } from "@/app/tabs";

import {
  appPreferences,
  updateCommentPreferences,
  updateDesignCheckPreferences,
  updateSnappingPreferences,
  type DesignCheckPreset,
} from "./store";

export function setSnappingPreference(
  preference: keyof SnappingPreferences,
  enabled: boolean
): void {
  applySnappingPreferences({ [preference]: enabled });
}

/** Stores snapping changes and pushes them to every open editor. */
export function applySnappingPreferences(
  changes: Partial<SnappingPreferences>
): void {
  updateSnappingPreferences(changes);
  const snapping = appPreferences.value.editing.snapping;
  for (const tab of getTabsSnapshot()) {
    tab.store.state.snappingPreferences = { ...snapping };
  }
}

export function setDesignCheckPreset(preset: DesignCheckPreset): void {
  updateDesignCheckPreferences({ preset });
}

export function turnOffDesignCheckRule(ruleId: string): void {
  const disabledRules = new Set(appPreferences.value.designCheck.disabledRules);
  disabledRules.add(ruleId);
  updateDesignCheckPreferences({ disabledRules: [...disabledRules] });
}

export function turnOnDesignCheckRules(): void {
  updateDesignCheckPreferences({ disabledRules: [] });
}

/** View → Comments: pins outside the Comment tool. */
export function setCommentsOnCanvas(showOnCanvas: boolean): void {
  updateCommentPreferences({ showOnCanvas });
}
