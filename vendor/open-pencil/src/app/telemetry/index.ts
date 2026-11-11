/** ui-manage: telemetry / usage sharing disabled. */

export type UsageEventInput = { name: string; [key: string]: unknown };

export function trackUsage(_event: UsageEventInput): void {}

export function trackDocumentFormat(
  _name: "document_opened" | "document_exported",
  _format: string
): void {}

export const usageStatsConsent = { value: null as boolean | null };
export const usageStatsPrompt = { value: false };

export function offerUsageStatsPrompt(): void {}
export function setUsageStatsConsent(_value: boolean | null): void {}

/** No-op: official builds would start daily pings here. */
export async function startSharing(): Promise<void> {}
