import 'dotenv/config'
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
app.use(express.json({ limit: '30mb' }))

const platformIds = new Set(platforms.map((item) => item.id))

const directorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    reason: { type: 'string' },
    shots: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          source: { type: 'string' },
          duration: { type: 'integer', minimum: 1, maximum: 12 },
          framing: { type: 'string' },
          camera: { type: 'string' },
          emotion: { type: 'string' },
          subject: { type: 'string' },
          action: { type: 'string' },
          environment: { type: 'string' },
          lighting: { type: 'string' },
          continuity: { type: 'string' },
          dialogue: { type: 'string' },
          sound: { type: 'string' },
        },
        required: [
          'title',
          'source',
          'duration',
          'framing',
          'camera',
          'emotion',
          'subject',
          'action',
          'environment',
          'lighting',
          'continuity',
          'dialogue',
          'sound',
        ],
      },
    },
  },
  required: ['title', 'summary', 'reason', 'shots'],
} as const

function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === 'string' && platformIds.has(value as PlatformId)
}

function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)
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
  mode: InputMode | 'reference-image' | 'reference-video',
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
  const defaultTitle =
    mode === 'script'
      ? 'AI 剧本分镜方案'
      : mode === 'reference-image'
        ? '参考图反推方案'
        : mode === 'reference-video'
          ? '参考视频反推方案'
          : 'AI 画面导演方案'

  return {
    title: asText(raw.title, defaultTitle),
    summary: asText(raw.summary, `AI 已设计 ${shots.length} 个可生成镜头。`),
    totalDuration: shots.reduce((sum, shot) => sum + shot.duration, 0),
    recommendedPlatform: platform,
    recommendedModel: platformInfo.models[0],
    reason: asText(raw.reason, platformInfo.specialty),
    shots,
  }
}

function applyLocksToPlan(plan: DirectorPlan, locks: string) {
  const normalized = locks.trim()
  if (!normalized) return plan

  return {
    ...plan,
    shots: plan.shots.map((shot) => ({
      ...shot,
      continuity: shot.continuity.includes(normalized)
        ? shot.continuity
        : `${shot.continuity}；全局一致性锁：${normalized}`,
    })),
  }
}

function structuredTextFormat() {
  return {
    format: {
      type: 'json_schema' as const,
      name: 'framepilot_director_plan',
      strict: true,
      schema: directorSchema,
    },
  }
}

function directorInstructions(platform: PlatformId, mode: InputMode, locks = '') {
  const platformInfo = platforms.find((item) => item.id === platform)!
  const lockText = locks.trim()
    ? `\n全局一致性锁（所有镜头必须执行）：${locks.trim()}\n`
    : ''

  return `
你是一名面向中国 AI 视频生成工具的资深导演、分镜师和 Prompt Engineer。

任务：把用户的${mode === 'script' ? '剧本/文案' : '画面想法'}转换成真正可执行的镜头方案。
目标平台：${platformInfo.name}
默认模型：${platformInfo.models[0]}
平台强项：${platformInfo.specialty}
${lockText}
导演原则：
1. 不要机械按句号拆镜。按照视觉事件、动作完成度、情绪转折、对白反应和产品展示目的拆镜。
2. 每个镜头只承担一个主要视觉任务，通常 2-5 秒；必要时可到 8-10 秒。
3. 景别、机位、运镜必须服务于剧情，不要每个镜头都推拉摇移。
4. 有对白时要区分说话者和听者反应，必要时设计反打或近景。
5. 有产品时，优先保证产品结构、Logo、颜色和关键材质连续一致。
6. 图生视频 Prompt 应从首帧已经存在的内容出发，重点描述运动、演变和镜头，不重复堆砌静态外观。
7. 所有镜头都要考虑人物位置、视线方向、动作接续和场景关系。
8. 输出专业、具体、可执行的中文导演描述，不写空洞画质堆词。
`.trim()
}

function reverseInstructions(
  platform: PlatformId,
  kind: 'image' | 'video',
  context: string,
  duration?: number,
  locks = '',
) {
  const platformInfo = platforms.find((item) => item.id === platform)!
  const extraContext = context.trim() ? `用户补充目的：${context.trim()}` : '用户没有补充文字目的。'
  const durationText =
    kind === 'video' && duration && Number.isFinite(duration)
      ? `原视频时长约 ${duration.toFixed(1)} 秒。`
      : ''
  const lockText = locks.trim()
    ? `全局一致性锁（反推后所有 shot 都必须保留）：${locks.trim()}`
    : '用户没有额外设置全局一致性锁。'

  return `
你是一名资深影视导演、摄影指导和 AI 视频 Prompt Engineer。你会看到${kind === 'image' ? '一张参考图片' : '按时间顺序抽取的一组视频关键帧'}。

你的目标不是泛泛描述素材，而是“反推它是怎么被拍出来/应该怎么被生成出来”，然后把分析编译成可用于 ${platformInfo.name}（默认模型：${platformInfo.models[0]}）的镜头方案。

${durationText}
${extraContext}
${lockText}

必须完成：
1. 识别主体：人物、产品、道具、服装、材质、明显文字或 Logo。看不清的内容不要猜。
2. 反推画面：场景、构图、景别、机位、光线方向、时间氛围、色彩和质感。
3. ${kind === 'video' ? '根据关键帧之间的变化反推人物动作、镜头运动、节奏和可能的转场；无法仅凭关键帧确认的运镜要保守描述。' : '为这张静态图设计最合理的图生视频运动方案：区分主体运动、环境微运动和镜头运动，避免破坏原图结构。'}
4. 如果素材明显包含多个镜头/场景，拆成多个 shot；否则不要强行拆镜。
5. subject 要写清楚“哪些外观特征必须被锁定”；continuity 要明确哪些东西不能漂移。
6. action 只描述镜头里真正会发生的变化，不要把整张图片重新复述一遍。
7. framing 和 camera 必须具体，例如“胸像近景，略低机位”“缓慢 dolly-in 约 8%”，不要只写“电影运镜”。
8. 产品素材必须优先锁定产品结构、比例、颜色、Logo、接口和材质。
9. 输出中文，直接可用于创作，不写解释性废话。
`.trim()
}

function parseStructuredOutput(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  const json = start >= 0 && end >= start ? text.slice(start, end + 1) : text
  return JSON.parse(json) as Record<string, unknown>
}

function createClient() {
  if (!process.env.OPENAI_API_KEY) return null
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
    capabilities: {
      textDirector: true,
      imageReverse: true,
      videoKeyframeReverse: true,
      singleShotRegeneration: true,
      projectBibles: true,
    },
  })
})

app.post('/api/director', async (request, response) => {
  const { input, mode, platform, locks = '' } = request.body ?? {}

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

  const client = createClient()
  if (!client) {
    response.status(503).json({
      error: 'AI_NOT_CONFIGURED',
      message: 'AI key is not configured; frontend can use local fallback.',
    })
    return
  }

  try {
    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
      instructions: directorInstructions(platform, mode, asText(locks)),
      input: input.trim(),
      text: structuredTextFormat(),
    })

    const parsed = parseStructuredOutput(result.output_text)
    const plan = applyLocksToPlan(normalizePlan(parsed, mode, platform), asText(locks))
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

app.post('/api/reverse', async (request, response) => {
  const {
    kind,
    images,
    platform,
    context = '',
    locks = '',
    duration,
    width,
    height,
    name = '',
  } = request.body ?? {}

  if (kind !== 'image' && kind !== 'video') {
    response.status(400).json({ error: 'kind must be image or video' })
    return
  }

  if (!isPlatformId(platform)) {
    response.status(400).json({ error: 'invalid platform' })
    return
  }

  if (!Array.isArray(images) || !images.length || images.length > 8 || !images.every(isImageDataUrl)) {
    response.status(400).json({ error: 'images must contain 1-8 valid image data URLs' })
    return
  }

  const client = createClient()
  if (!client) {
    response.status(503).json({
      error: 'AI_NOT_CONFIGURED',
      message: 'Reference reverse analysis requires a vision-capable AI model.',
    })
    return
  }

  try {
    const metadata = [
      name ? `文件名：${name}` : '',
      Number.isFinite(width) && Number.isFinite(height) ? `原始尺寸：${width}×${height}` : '',
      kind === 'video' && Number.isFinite(duration) ? `原视频时长：${Number(duration).toFixed(1)} 秒` : '',
      kind === 'video' ? `关键帧数量：${images.length}，按时间顺序排列` : '',
    ].filter(Boolean).join('；')

    const visualContent = images.map((imageUrl: string) => ({
      type: 'input_image' as const,
      image_url: imageUrl,
      detail: kind === 'image' ? ('high' as const) : ('low' as const),
    }))

    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
      instructions: reverseInstructions(platform, kind, asText(context), Number(duration), asText(locks)),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text' as const,
              text: `请按提供顺序分析这些视觉素材。素材信息：${metadata || '无额外元数据'}。`,
            },
            ...visualContent,
          ],
        },
      ],
      text: structuredTextFormat(),
    })

    const parsed = parseStructuredOutput(result.output_text)
    const mode = kind === 'image' ? 'reference-image' : 'reference-video'
    const plan = applyLocksToPlan(normalizePlan(parsed, mode, platform), asText(locks))
    const compiled = compileDirectorPlan(plan, platform)

    response.json({
      engine: 'ai',
      model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
      result: compiled,
      source: {
        kind,
        frameCount: images.length,
        duration: kind === 'video' && Number.isFinite(duration) ? Number(duration) : null,
      },
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({
      error: 'REVERSE_FAILED',
      message: error instanceof Error ? error.message : 'Reference reverse analysis failed',
    })
  }
})


app.post('/api/shot/regenerate', async (request, response) => {
  const {
    shot,
    platform,
    locks = '',
    projectContext = '',
    instruction = '',
    referenceImages = [],
  } = request.body ?? {}

  if (!shot || typeof shot !== 'object') {
    response.status(400).json({ error: 'shot is required' })
    return
  }

  if (!isPlatformId(platform)) {
    response.status(400).json({ error: 'invalid platform' })
    return
  }

  const client = createClient()
  if (!client) {
    response.status(503).json({
      error: 'AI_NOT_CONFIGURED',
      message: 'Single-shot regeneration requires an AI model.',
    })
    return
  }

  try {
    const platformInfo = platforms.find((item) => item.id === platform)!
    const currentShot = normalizeShot(shot as Record<string, unknown>, 0)
    const lockText = asText(locks)
    const userInstruction = asText(instruction)
    const contextText = asText(projectContext)
    const validReferenceImages = Array.isArray(referenceImages)
      ? referenceImages.filter(isImageDataUrl).slice(0, 6)
      : []

    const shotInput = validReferenceImages.length
      ? [
          {
            role: 'user' as const,
            content: [
              {
                type: 'input_text' as const,
                text: `请重设计这个镜头：${currentShot.source}。这些图片是当前镜头必须参考的人物/产品视觉锚点，请保持身份、产品结构、Logo、颜色和材质一致。`,
              },
              ...validReferenceImages.map((imageUrl: string) => ({
                type: 'input_image' as const,
                image_url: imageUrl,
                detail: 'high' as const,
              })),
            ],
          },
        ]
      : `请重设计这个镜头：${currentShot.source}`

    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
      instructions: `
你是 FramePilot 的单镜头重设计导演。

目标：只优化一个镜头，不改变整个项目的故事方向。
目标平台：${platformInfo.name}
默认模型：${platformInfo.models[0]}

当前镜头：
${JSON.stringify(currentShot, null, 2)}

项目上下文：
${contextText || '无额外项目上下文'}

全局一致性锁：
${lockText || '无额外一致性锁'}

用户对这个镜头的修改要求：
${userInstruction || '在不改变剧情意图的前提下，让镜头更专业、更可执行。'}

要求：
1. 保留当前镜头承担的剧情功能，除非用户明确要求改变。
2. 只返回一个 shot。
3. 明确主体、动作、场景、景别、机位、运镜、光线、情绪、对白、声音和连续性。
4. 连续性必须兼容前后镜头，不得破坏全局锁。
5. 不写空洞的“电影感”“高级感”堆词，要可执行。
6. duration 控制在 1-12 秒。
7. 如果提供了参考图，它们是视觉锚点：人物身份、五官、服装、产品结构、Logo、颜色和关键材质不得擅自改动。
`.trim(),
      input: shotInput,
      text: structuredTextFormat(),
    })

    const parsed = parseStructuredOutput(result.output_text)
    const plan = applyLocksToPlan(normalizePlan(parsed, 'idea', platform), lockText)
    const compiled = compileDirectorPlan(plan, platform)
    const replacement = compiled.shots[0]

    response.json({
      engine: 'ai',
      model: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
      shot: replacement,
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({
      error: 'SHOT_REGENERATE_FAILED',
      message: error instanceof Error ? error.message : 'Single-shot regeneration failed',
    })
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`FramePilot Director API listening on http://localhost:${port}`)
})
