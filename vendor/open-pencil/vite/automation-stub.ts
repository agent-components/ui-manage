/** Stub used when OPENPENCIL_UI_MANAGE=1 so MCP automation is never loaded. */
export function localAutomationToken(_command: string): string | null {
  return null
}

export function localAutomationRoute(_host: string | undefined) {
  return { browserURL: 'ws://127.0.0.1:0' }
}

export function openPencilAutomationPlugin(
  _command: string,
  _host: string | undefined
): undefined {
  return undefined
}
