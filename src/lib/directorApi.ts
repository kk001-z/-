import { analyze, type AnalysisResult, type InputMode } from './promptEngine'
import type { PlatformId } from './modelCatalog'

export interface DirectorResponse {
  result: AnalysisResult
  engine: 'ai' | 'local'
  model?: string
  notice?: string
}

export async function analyzeWithDirector(
  input: string,
  mode: InputMode,
  platform: PlatformId,
): Promise<DirectorResponse> {
  try {
    const response = await fetch('/api/director', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, mode, platform }),
    })

    if (response.ok) {
      const data = await response.json() as {
        result: AnalysisResult
        engine: 'ai'
        model?: string
      }
      return data
    }

    const data = await response.json().catch(() => ({})) as { error?: string }

    if (response.status !== 503 && data.error !== 'AI_NOT_CONFIGURED') {
      console.warn('AI Director API failed, using local fallback:', data)
    }
  } catch (error) {
    console.warn('AI Director API unavailable, using local fallback:', error)
  }

  return {
    result: analyze(input, mode, platform),
    engine: 'local',
    notice: '当前使用本地演示引擎。配置服务端 AI 密钥后会自动启用真正的 AI Director。',
  }
}
