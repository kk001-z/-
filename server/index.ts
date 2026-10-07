import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import {
  compileDirectorPlan,
  type DirectorPlan,
  type DirectorShot,
  type InputMode,
} from '../src/lib/promptEngine'
import { platforms, type PlatformId } from '../src/lib/modelCatalog'

const app = express()
const port = Number(process.env.DIRECTOR_PORT ?? 8787)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const platformIds = new Set(platforms.map((item) => item.id))

function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === 'string' && platformIds.has(value as PlatformId)
}

function stripCodeFence(value: string) {
  return value
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asDuration(value: unknown, fallback = 3) {
  const duration = Number(value)
  if (!Number.isFinite(duration)) return fallback
  return Math.max(1, Math.min(12, Math.round(duration)))
}

function normalizeShot(raw: Record<string, unknown>, index: number): DirectorShot {
  const source = asText(raw.source, asText(raw.action, `镜头 ${index + 1}`))
  return {
    id: index + 1,
    title: asText(raw.title, source.slice(0, 18)),
    source,
    duration: asDuration(raw.duration),
    framing: asText(raw.framing, '中景'),
    camera: asText(raw.camera, '稳定机位 + 轻微推进'),
    emotion: asText(raw.emotion, '自然、真实'),
    subject: asText(raw.subject, '主要人物或主体'),
    action: asText(raw.action, source),
    environment: asText(raw.environment, '与剧情匹配的真实环境'),
    lighting: asText(raw.lighting, '自然电影光线'),
    continuity: asText(raw.continuity, '保持人物、服装、产品与空间关系连续一致'),
    dialogue: asText(raw.dialogue),
    sound: asText(raw.sound),
  }
}

function normalizePlan(
  raw: Record<string, unknown>,
  mode: InputMode,
  platform: PlatformId,
): DirectorPlan {
  const rawShots = Array.isArray(raw.shots) ? raw.shots : []
  const shots = rawShots
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .slice(0, 12)
    .map(normalizeShot)

  if (!shots.length) {
    throw new Error('AI did not return usable shots')
  }

  const platformInfo = platforms.find((item) => item.id === platform)!

  return {
    title: asText(raw.title, mode === 'script' ? 'AI 剧本分镜方案' : 'AI 画面导演方案'),
    summary: asText(raw.summary, `AI 已设计 ${shots.length} 个可生成镜头。`),
    totalDuration: shots.reduce((sum, shot) => sum + shot.duration, 0),
    recommendedPlatform: platform,
    recommendedModel: platformInfo.models[0],
    reason: asText(raw.reason, platformInfo.specialty),
    shots,
  }
}

function directorInstructions(platform: PlatformId, mode: InputMode) {
  const platformInfo = platforms.find((item) => item.id === platform)!

  return `
你是一名面向中国 AI 视频生成工具的资深导演、分镜师和 Prompt Engineer。

任务：把用户的${mode === 'script' ? '剧本/文案' : '画面想法'}转换成真正可执行的镜头方案。
目标平台：${platformInfo.name}
默认模型：${platformInfo.models[0]}
平台强项：${platformInfo.specialty}

导演原则：
1. 不要机械按句号拆镜。按照视觉事件、动作完成度、情绪转折、对白反应和产品展示目的拆镜。
2. 每个镜头只承担一个主要视觉任务，通常 2-5 秒；必要时可到 8-10 秒。
3. 景别、机位、运镜必须服务于剧情，不要每个镜头都推拉摇移。
4. 有对白时要区分说话者和听者反应，必要时设计反打或近景。
5. 有产品时，优先保证产品结构、Logo、颜色和关键材质连续一致。
6. 需要从图生视频时，动作设计要从首帧已经存在什么出发，避免重复描述静态外观。
7. 所有镜头都必须考虑前后连续性，明确人物位置、视线方向、动作接续和场景关系。
8. 中文输出，专业但简洁，不写空洞的画质堆词。

只返回严格 JSON，不要 Markdown，不要解释。JSON 结构：
{
  "title": "方案标题",
  "summary": "一句话导演策略",
  "reason": "为什么这个模型适合",
  "shots": [
    {
      "title": "镜头名称",
      "source": "这个镜头承接的原始剧情或意图",
      "duration": 3,
      "framing": "景别和机位",
      "camera": "运镜",
      "emotion": "情绪",
      "subject": "主体与关键外观",
      "action": "镜头内实际发生的动作",
      "environment": "环境与空间",
      "lighting": "光线与时间",
      "continuity": "与前后镜头必须锁定的连续性",
      "dialogue": "对白，没有就空字符串",
      "sound": "环境音、动作音或音乐建议，没有就空字符串"
    }
  ]
}
`.trim()
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
  })
})

app.post('/api/director', async (request, response) => {
  const { input, mode, platform } = request.body ?? {}

  if (typeof input !== 'string' || !input.trim()) {
    response.status(400).json({ error: 'input is required' })
    return
  }

  if (mode !== 'idea' && mode !== 'script') {
    response.status(400).json({ error: 'mode must be idea or script' })
    return
  }

  if (!isPlatformId(platform)) {
    response.status(400).json({ error: 'invalid platform' })
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({
      error: 'AI_NOT_CONFIGURED',
      message: 'AI key is not configured; frontend can use local fallback.',
    })
    return
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
      instructions: directorInstructions(platform, mode),
      input: input.trim(),
    })

    const rawText = stripCodeFence(result.output_text)
    const parsed = JSON.parse(rawText) as Record<string, unknown>
    const plan = normalizePlan(parsed, mode, platform)
    const compiled = compileDirectorPlan(plan, platform)

    response.json({
      engine: 'ai',
      model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
      result: compiled,
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({
      error: 'DIRECTOR_FAILED',
      message: error instanceof Error ? error.message : 'AI director failed',
    })
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`FramePilot Director API listening on http://localhost:${port}`)
})
