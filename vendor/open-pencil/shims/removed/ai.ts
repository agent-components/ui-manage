
export class APICallError extends Error {
  statusCode?: number
  constructor(message = 'AI disabled') { super(message); this.name = 'APICallError' }
}
export class StreamProviderError extends Error {
  constructor(message = 'AI disabled') { super(message); this.name = 'StreamProviderError' }
}
export class DirectChatTransport {
  constructor(_opts?: unknown) {}
}
export class ToolLoopAgent {
  constructor(_opts?: unknown) {}
}
export function asSchema(schema: unknown) { return schema }
export function convertToModelMessages(_msgs: unknown) { return [] }
export function createUIMessageStream(_opts?: unknown) {
  return { pipeThrough() { return this }, pipeTo() { return Promise.resolve() } }
}
export const defaultSettingsMiddleware = {}
export function generateId() { return 'stub-id' }
export async function generateText(_opts?: unknown) {
  throw new APICallError('AI disabled')
}
export function getToolName(part: any) { return part?.toolName ?? '' }
export function isReasoningUIPart(_p: unknown) { return false }
export function isTextUIPart(_p: unknown) { return false }
export function isToolUIPart(_p: unknown) { return false }
export function stepCountIs(_n: number) { return () => true }
export function tool(def: unknown) { return def }
export function wrapLanguageModel(model: unknown) { return model }

export type UIMessage = Record<string, unknown>
export type UIMessageChunk = Record<string, unknown>
export type LanguageModel = unknown
export type LanguageModelUsage = Record<string, unknown>
export type ModelMessage = Record<string, unknown>
export type ChatTransport = unknown
export type FinishReason = string
export type UIDataTypes = Record<string, unknown>
export type UIMessagePart = Record<string, unknown>
export type UITools = Record<string, unknown>
export type ToolSet = Record<string, unknown>
export type StepResult = Record<string, unknown>
export type CallWarning = Record<string, unknown>
export type LanguageModelCallOptions = Record<string, unknown>
