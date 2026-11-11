export function createDefaultStackParser() {
  return () => []
}

export class DOMExceptionCoercer {}
export class ErrorCoercer {}
export class ErrorEventCoercer {}
export class EventCoercer {}
export class ObjectCoercer {}
export class PrimitiveCoercer {}
export class PromiseRejectionEventCoercer {}
export class StringCoercer {}

export class ErrorPropertiesBuilder {
  constructor(_coercers?: unknown, _parser?: unknown) {}
  buildFromUnknown(_error?: unknown) {
    return { exception: { values: [] as unknown[] } }
  }
}

export function getInjectedReleaseId() {
  return null
}

export type Exception = Record<string, unknown>
export type StackFrame = Record<string, unknown>
