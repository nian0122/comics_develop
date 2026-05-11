import { fetchJson } from './api.js'

export function fetchTools() {
  return fetchJson('/api/tools')
}

export function executeTool(toolName, params = {}) {
  return fetchJson(`/api/tools/${encodeURIComponent(toolName)}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
}

export function fetchToolStatus(executionId) {
  return fetchJson(`/api/tools/status/${encodeURIComponent(executionId)}`)
}

export function fetchExecutions() {
  return fetchJson('/api/tools/executions')
}

export function cancelExecution(executionId) {
  return fetchJson(`/api/tools/cancel/${encodeURIComponent(executionId)}`, {
    method: 'POST'
  })
}

export function cleanupExecutions() {
  return fetchJson('/api/tools/cleanup', {
    method: 'POST'
  })
}
