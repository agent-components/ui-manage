
export class WebviewWindow {
  label: string
  constructor(label: string, _opts?: unknown) { this.label = label }
  static getByLabel(_label: string) { return null }
  async close() {}
  async show() {}
  async setFocus() {}
  async listen() { return () => undefined }
}
