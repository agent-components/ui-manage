
export const MCP_TOOL_SCOPES = [] as const
export type MCPToolScope = string
export type ToolDescriptor = { name: string; scope?: string }
export const SELECTION_SCOPE_FILE_OUTPUT_ERROR = 'selection-scope-file-output'
export const SELECTION_SCOPE_TOOLS: string[] = []
export function createToolDescriptors(): ToolDescriptor[] { return [] }
export function isSelectionScopeTool(_name: string): boolean { return false }
export function parseToolDescriptor(_raw: unknown): ToolDescriptor | null { return null }
export function serializeDisabledTools(_tools?: unknown): string { return '[]' }
