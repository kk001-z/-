export interface RuntimeCapabilities {
  staticMode: boolean
  apiAvailable: boolean
  aiConfigured: boolean
  model?: string
}

export async function detectRuntimeCapabilities(): Promise<RuntimeCapabilities> {
  try {
    const response = await fetch('/api/health', { signal: AbortSignal.timeout(3000) })
    if (!response.ok) throw new Error('health failed')
    const data = await response.json() as {
      aiConfigured?: boolean
      model?: string
    }
    return {
      staticMode: false,
      apiAvailable: true,
      aiConfigured: Boolean(data.aiConfigured),
      model: data.model,
    }
  } catch {
    return {
      staticMode: true,
      apiAvailable: false,
      aiConfigured: false,
    }
  }
}
