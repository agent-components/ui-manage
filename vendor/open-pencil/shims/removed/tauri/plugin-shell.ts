
export class Command {
  constructor(_program: string, _args?: string[], _opts?: unknown) {}
  static create(program: string, args?: string[], opts?: unknown) { return new Command(program, args, opts) }
  async execute() { return { code: 1, stdout: '', stderr: 'unavailable' } }
  spawn() { return Promise.reject(new Error('shell unavailable')) }
  stdout = { on: () => undefined }
  stderr = { on: () => undefined }
  on = () => undefined
}
