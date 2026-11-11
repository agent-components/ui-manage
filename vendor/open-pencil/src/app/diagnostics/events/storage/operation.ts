export type StorageDiagnosticOperation =
  | "upload"
  | "download"
  | "delete"
  | "list";

/** Legacy helper retained for diagnostics API surface; client outbox jobs are gone. */
export function storageOperationForJob(
  type: "putCanvas" | "deleteCanvas" | string
): StorageDiagnosticOperation {
  switch (type) {
    case "putCanvas":
      return "upload";
    case "deleteCanvas":
      return "delete";
    default:
      throw new Error("Unsupported storage job type");
  }
}
