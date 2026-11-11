/** ui-manage: recent files menu removed. */

export const OPEN_RECENT_EVENT_PREFIX = "open-recent:";

export async function syncRecentFilesMenu(): Promise<void> {}

export function watchRecentFilesMenu(): () => void {
  return () => {};
}
