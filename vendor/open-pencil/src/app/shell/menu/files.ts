import { useFileDialog } from '@vueuse/core'
import { uniq } from 'es-toolkit/array'
import { basename } from 'pathe'
import { decode } from 'ufo'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { setOpenPencilOpenFileHandler } from '@/app/browser-bridge'
import {
  resolveBrowserFileURL,
  MAX_REMOTE_DOCUMENT_BYTES,
  readBoundedBody
} from '@/app/document/io/browser'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'
import { openFileInNewTab } from '@/app/tabs'
import { IS_BROWSER } from '@/constants'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const DOM_DOCUMENT_EXTENSIONS = ['html', 'htm', 'xhtml'] as const
const READABLE_DOCUMENT_EXTENSIONS = uniq([
  ...io.listReadableFormats().flatMap((format) => format.extensions),
  ...DOM_DOCUMENT_EXTENSIONS
])
const DESIGN_FILE_ACCEPT = READABLE_DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(
  ','
)

const fileDialog = useFileDialog({
  accept: DESIGN_FILE_ACCEPT,
  multiple: true,
  reset: true
})

fileDialog.onChange((files) => {
  if (!files) return
  void openDesignFileBatch(
    files,
    (file) => file.name,
    (file) => openDesignFile(file)
  )
})

/**
 * Opens a picked or dropped document in a new tab, rejecting formats OpenPencil cannot read.
 * A file system handle, when the browser provides one, lets the tab save back to the file.
 */
export async function openDesignFile(file: File, handle?: FileSystemFileHandle): Promise<void> {
  assertSupportedDesignFile(file.name)
  await openFileInNewTab(file, handle)
}

if (IS_BROWSER && 'window' in globalThis) {
  setOpenPencilOpenFileHandler(async (path: string) => {
    await openBrowserFileFromURL(resolveBrowserFileURL(path))
  })
}

/**
 * The file name a URL ends in, decoded, so `my%20design.fig` opens as "my design"; a malformed
 * escape stays as written.
 */
function fileNameFromURL(url: URL): string {
  return decode(basename(url.pathname)) || 'file.fig'
}

/** Fetches a document over HTTP and opens it in a new tab. Browser builds only. */
export async function openBrowserFileFromURL(url: URL, init?: RequestInit): Promise<void> {
  // The cap needs a controller of its own, so a caller's signal is combined with it
  // rather than replaced: dropping it would leave the caller unable to cancel.
  const controller = new AbortController()
  const signal = init?.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal
  const response = await fetch(url, { ...init, signal })
  if (!response.ok)
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
  const bytes = await readBoundedBody(response, MAX_REMOTE_DOCUMENT_BYTES, {
    onExceeded: () => controller.abort()
  })
  if (bytes.byteLength === 0) {
    throw new Error('Failed to fetch file: the response carried no body')
  }
  const name = fileNameFromURL(url)
  assertSupportedDesignFile(name)
  const file = new File([bytes], name, { type: 'application/octet-stream' })
  await openFileInNewTab(file, undefined, url.href)
}

function isSupportedDesignFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase()
  return (
    io.findReader(fileName) !== null ||
    DOM_DOCUMENT_EXTENSIONS.some((extension) => lowerName.endsWith(`.${extension}`))
  )
}

function assertSupportedDesignFile(fileName: string): void {
  if (!isSupportedDesignFile(fileName)) {
    throw new Error(`Unsupported document format: ${fileName}`)
  }
}

export async function openDesignFileBatch<T>(
  items: Iterable<T>,
  displayName: (item: T) => string,
  openItem: (item: T) => Promise<void>
): Promise<void> {
  for (const item of items) {
    try {
      await openItem(item)
    } catch (error) {
      const name = displayName(item)
      const detail = error instanceof Error ? error.message : String(error)
      console.error(`Failed to open ${name}:`, error)
      toast.error(notificationMessages.get().openFileFailed({ name, error: detail }))
    }
  }
}

export async function openFileDialog() {
  if (window.showOpenFilePicker) {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: 'Design file',
            accept: {
              'application/octet-stream': ['.fig', '.jam'],
              'application/json': ['.pen'],
              'text/html': ['.html', '.htm'],
              'application/xhtml+xml': ['.xhtml'],
              'text/plain': ['.pen']
            }
          }
        ]
      })
      await openDesignFileBatch(
        handles,
        (handle) => handle.name,
        async (handle) => {
          const file = await handle.getFile()
          assertSupportedDesignFile(file.name)
          await openFileInNewTab(file, handle)
        }
      )
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }

  fileDialog.open()
}

export async function importFileDialog() {
  await openFileDialog()
}
