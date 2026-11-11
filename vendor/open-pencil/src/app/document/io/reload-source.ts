import { readFile as tauriRead } from '@tauri-apps/plugin-fs'

import { readFigFile } from '@open-pencil/core/io/formats/fig'
import { IS_TAURI } from '@/constants'


export type ReloadSourceOptions = {
  documentName: string
  filePath: string | null
  fileHandle: FileSystemFileHandle | null
  signal?: AbortSignal
}

export async function readReloadSource({
  documentName,
  filePath,
  fileHandle,
  signal
}: ReloadSourceOptions) {
  signal?.throwIfAborted()
  if (filePath && IS_TAURI) {
    const bytes = await tauriRead(filePath)
    signal?.throwIfAborted()
    const blob = new Blob([bytes])
    const file = new File([blob], `${documentName}.fig`)
    return readFigFile(file, { populate: 'first-page', signal })
  }

  if (fileHandle) {
    const file = await fileHandle.getFile()
    signal?.throwIfAborted()
    return readFigFile(file, { populate: 'first-page', signal })
  }

  return null
}
