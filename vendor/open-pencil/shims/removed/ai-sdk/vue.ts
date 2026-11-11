
export class Chat {
  messages: unknown[] = []
  status = 'ready'
  constructor(_opts?: unknown) {}
  async sendMessage() { throw new Error('AI disabled') }
  stop() {}
}
