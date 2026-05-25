export interface ToolParamOption {
  value?: string
  label?: string
}

export interface ToolParam {
  key: string
  label: string
  type?: string
  required?: boolean
  default?: string
  options?: ToolParamOption[]
}

export interface ToolInfo {
  name: string
  displayName?: string
  description?: string
  params?: ToolParam[]
}

export interface ExecutionResult {
  executionId?: string
}

export interface ExecutionStatus {
  executionId?: string
  status?: string
  processedCount?: number
  skippedCount?: number
  errorCount?: number
  durationSeconds?: number
  finished?: boolean
  logs?: string[]
}

export interface ToolExecution {
  executionId: string
  toolName?: string
  status?: string
}

export type ExecutionsMap = Record<string, ToolExecution>
