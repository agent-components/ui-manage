import type { StorageDocumentBinding } from "@/app/document/io/storage-binding";

type DocumentWriterOptions = {
  getFileHandle: () => FileSystemFileHandle | null;
  getStorageBinding: () => StorageDocumentBinding | null;
  setSavedVersion: (version: number) => void;
  setLastWriteTime: (time: number) => void;
  onWriteSuccess?: (version: number) => void | Promise<void>;
};

export function createDocumentWriter({
  getFileHandle,
  getStorageBinding,
  setSavedVersion,
  setLastWriteTime,
  onWriteSuccess,
}: DocumentWriterOptions) {
  async function finishWrite(version: number): Promise<true> {
    setSavedVersion(version);
    try {
      await onWriteSuccess?.(version);
    } catch (error) {
      console.warn("[Recovery] Cleanup after document write failed:", error);
    }
    return true;
  }

  return async function writeFile(
    data: Uint8Array,
    version: number
  ): Promise<boolean> {
    setLastWriteTime(Date.now());
    // Client object-storage bindings are removed; ui-manage persists via bridge saveFigFileCopy.
    if (getStorageBinding()) return false;

    const fileHandle = getFileHandle();
    if (fileHandle) {
      const writable = await fileHandle.createWritable();
      await writable.write(new Uint8Array(data));
      await writable.close();
      return await finishWrite(version);
    }
    return false;
  };
}
