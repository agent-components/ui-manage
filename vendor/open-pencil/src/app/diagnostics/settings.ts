import { useLocalStorage } from "@vueuse/core";
import { clamp } from "es-toolkit";

/** Number of most recent events kept locally (no Settings UI in ui-manage). */
export type DiagnosticsRetention = number;

export const DIAGNOSTICS_RETENTION_DEFAULT: DiagnosticsRetention = 500;
export const DIAGNOSTICS_RETENTION_MIN = 50;
export const DIAGNOSTICS_RETENTION_MAX = 20_000;

/** Clamp stored values, falling back to the default when unusable. */
export function resolveDiagnosticsRetention(
  value: unknown
): DiagnosticsRetention {
  const parsed =
    typeof value === "string"
      ? value.trim() === ""
        ? Number.NaN
        : Number(value)
      : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    return DIAGNOSTICS_RETENTION_DEFAULT;
  }
  return clamp(
    Math.round(parsed),
    DIAGNOSTICS_RETENTION_MIN,
    DIAGNOSTICS_RETENTION_MAX
  );
}

const diagnosticsEnabled = useLocalStorage(
  "open-pencil:diagnostics-enabled",
  true
);
const usageEnabled = useLocalStorage("open-pencil:usage-enabled", true);
const diagnosticsRetention = useLocalStorage<DiagnosticsRetention>(
  "open-pencil:diagnostics-retention",
  500,
  {
    serializer: {
      read: (value) => resolveDiagnosticsRetention(value),
      write: String,
    },
  }
);

export function isDiagnosticsEnabled(): boolean {
  return diagnosticsEnabled.value;
}

export function isUsageEnabled(): boolean {
  return usageEnabled.value;
}

export function getDiagnosticsRetention(): DiagnosticsRetention {
  return diagnosticsRetention.value;
}
