import {
  analyze,
  applyGlobalLocks,
  type AnalysisResult,
  type InputMode,
  type Shot,
} from './promptEngine'
import type { PlatformId } from './modelCatalog'
import type { PreparedReference } from './media'

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
  locks = '',
  referenceImages: string[] = [],
  creativeContext = '',
): Promise<DirectorResponse> {
  try {
    const response = await fetch('/api/director', {
      signal: AbortSignal.timeout(45000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, mode, platform, locks, referenceImages, creativeContext }),
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
    result: applyGlobalLocks(analyze(input, mode, platform), locks, platform),
    engine: 'local',
    notice: '当前使用本地演示引擎。配置服务端 AI 密钥后会自动启用真正的 AI Director。',
  }
}

export async function analyzeReferenceWithDirector(
  reference: PreparedReference,
  platform: PlatformId,
  context = '',
  locks = '',
  lockedReferenceImages: string[] = [],
): Promise<DirectorResponse> {
  const response = await fetch('/api/reverse', {
    signal: AbortSignal.timeout(60000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: reference.kind,
      name: reference.name,
      duration: reference.duration,
      width: reference.width,
      height: reference.height,
      images: reference.frames,
      timestamps: reference.timestamps || [],
      platform,
      context,
      locks,
      lockedReferenceImages,
    }),
  })

  const data = await response.json().catch(() => ({})) as {
    result?: AnalysisResult
    engine?: 'ai'
    model?: string
    error?: string
    message?: string
  }

  if (!response.ok || !data.result) {
    if (data.error === 'AI_NOT_CONFIGURED') {
      throw new Error('参考素材反推需要视觉 AI。请先在服务端 .env 中配置 OPENAI_API_KEY。')
    }
    throw new Error(data.message || '参考素材反推失败，请稍后重试。')
  }

  return {
    result: data.result,
    engine: 'ai',
    model: data.model,
  }
}


export async function regenerateShotWithDirector(
  shot: Shot,
  platform: PlatformId,
  locks = '',
  projectContext = '',
  instruction = '',
  referenceImages: string[] = [],
): Promise<{ shot: Shot; model?: string }> {
  const response = await fetch('/api/shot/regenerate', {
    signal: AbortSignal.timeout(60000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shot,
      platform,
      locks,
      projectContext,
      instruction,
      referenceImages,
    }),
  })

  const data = await response.json().catch(() => ({})) as {
    shot?: Shot
    model?: string
    error?: string
    message?: string
  }

  if (!response.ok || !data.shot) {
    if (data.error === 'AI_NOT_CONFIGURED') {
      throw new Error('单镜重生成需要 AI。请先在服务端 .env 中配置 OPENAI_API_KEY。')
    }
    throw new Error(data.message || '单镜重生成失败，请稍后重试。')
  }

  return {
    shot: data.shot,
    model: data.model,
  }
}
