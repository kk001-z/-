import { PlatformId, platforms } from './modelCatalog'

export type InputMode = 'idea' | 'script'

export interface Shot {
  id: number
  title: string
  source: string
  duration: number
  framing: string
  camera: string
  emotion: string
  firstFramePrompt: string
  videoPrompt: string
  negativePrompt: string
}

export interface AnalysisResult {
  title: string
  summary: string
  totalDuration: number
  recommendedPlatform: PlatformId
  recommendedModel: string
  reason: string
  shots: Shot[]
}

const clean = (text: string) =>
  text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()

function splitToBeats(text: string, mode: InputMode): string[] {
  const normalized = clean(text)
  if (!normalized) return []

  const rough = normalized
    .split(mode === 'script' ? /\n+|(?<=[。！？!?；;])/ : /(?<=[。！？!?；;，,])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)

  if (rough.length <= 1) {
    return normalized
      .split(/[，,。；;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
  }

  return rough.slice(0, 8)
}

function inferFraming(beat: string, index: number) {
  if (/特写|眼神|手|产品|logo|细节|耳机|手机|钓箱/.test(beat)) return '特写 / 近景'
  if (/走进|进入|街道|河边|城市|房间|环境|远处/.test(beat)) return '全景 / 中景'
  if (/说|问|看|转头|笑|哭|表情/.test(beat)) return '中近景'
  return index === 0 ? '建立镜头 / 中景' : '中景'
}

function inferCamera(beat: string) {
  if (/环绕|绕|360/.test(beat)) return '慢速环绕'
  if (/推进|靠近|看清|特写/.test(beat)) return '缓慢推近'
  if (/后退|拉远|展开/.test(beat)) return '缓慢拉远'
  if (/跟随|走|跑|骑|移动/.test(beat)) return '稳定跟拍'
  if (/突然|快速|冲|爆发/.test(beat)) return '快速推进 + 动作跟随'
  return '稳定机位 + 轻微电影感运动'
}

function inferEmotion(beat: string) {
  if (/惊|突然|意外|发现/.test(beat)) return '意外、注意力瞬间集中'
  if (/开心|笑|舒服|轻松/.test(beat)) return '轻松、自然'
  if (/累|痛|酸|疲惫/.test(beat)) return '疲惫、压抑'
  if (/紧张|追|跑|危险/.test(beat)) return '紧张、节奏加快'
  return '自然、克制、真实'
}

function shotTitle(beat: string, index: number) {
  const core = beat.replace(/[。！？!?；;,，]/g, '').slice(0, 16)
  return core || `镜头 ${index + 1}`
}

function recommendPlatform(text: string): PlatformId {
  if (/产品|广告|商品|结构|logo|包装|钓箱|耳机/.test(text)) return 'kling'
  if (/动漫|二次元|多角色|角色一致/.test(text)) return 'vidu'
  if (/表情|情绪|哭|笑|表演|对白/.test(text)) return 'hailuo'
  if (/多镜头|剧情|短剧|故事|转场/.test(text)) return 'xiaoyunque'
  return 'xiaoyunque'
}

function modelFor(platform: PlatformId) {
  return platforms.find((p) => p.id === platform)?.models[0] ?? 'Seedance 2.5'
}

function platformPrompt(platform: PlatformId, beat: string, framing: string, camera: string, emotion: string, duration: number) {
  const base = `主体动作：${beat}。景别：${framing}。运镜：${camera}。情绪：${emotion}。时长约 ${duration} 秒。`

  switch (platform) {
    case 'kling':
      return `${base} 保持主体身份、服装、产品结构和场景空间关系稳定。动作连续自然，真实物理反馈，避免不必要的形变。镜头运动精准、平滑，结尾形成可继续衔接的稳定画面。`
    case 'vidu':
      return `${base} 如果提供参考图，将人物、产品和场景分别作为独立参考锚点；保持角色一致性和关键视觉特征。动作清晰，不改变已锁定的角色身份与服装。`
    case 'hailuo':
      return `${base} 优先表现人物微表情、眼神、呼吸和身体重心变化，让表演有真实情绪递进。镜头服务于人物状态，不做无意义炫技运镜。`
    case 'wan':
      return `${base} 使用中文电影化描述，明确主体、动作、空间、光线和镜头关系；保证动作因果连续、环境稳定、画面不闪烁。`
    case 'libtv':
      return `${base} 作为聚合平台通用 Prompt：优先选择适合该镜头的 Seedance / Wan / MiniMax 模型；只描述真正需要发生的动作与镜头变化，锁定关键主体外观。`
    case 'jimeng':
    case 'xiaoyunque':
    default:
      return `0-${duration}s：${beat}。${framing}，${camera}。人物/主体保持一致，动作从前一状态自然过渡到下一状态；环境细节有轻微真实运动，主体结构不漂移。整体为电影级真实质感，${emotion}。`
  }
}

function firstFrame(beat: string, framing: string, emotion: string) {
  return `${beat.replace(/[。！？!?]$/g, '')}的关键起始瞬间，${framing}，主体清晰，构图有明确前中后景，${emotion}，自然真实光线，电影级摄影质感，材质细节清楚，画面干净，高一致性，为后续图生视频保留明确动作空间。`
}

export function analyze(input: string, mode: InputMode, targetPlatform?: PlatformId): AnalysisResult {
  const beats = splitToBeats(input, mode)
  const source = clean(input)
  const recommendedPlatform = targetPlatform ?? recommendPlatform(source)
  const model = modelFor(recommendedPlatform)

  const shots = (beats.length ? beats : ['请先输入你想要的画面或剧本']).map((beat, index) => {
    const framing = inferFraming(beat, index)
    const camera = inferCamera(beat)
    const emotion = inferEmotion(beat)
    const duration = /特写|细节/.test(beat) ? 2 : /对白|说|问/.test(beat) ? 4 : 3

    return {
      id: index + 1,
      title: shotTitle(beat, index),
      source: beat,
      duration,
      framing,
      camera,
      emotion,
      firstFramePrompt: firstFrame(beat, framing, emotion),
      videoPrompt: platformPrompt(recommendedPlatform, beat, framing, camera, emotion, duration),
      negativePrompt: '避免主体变形、五官漂移、手指异常、产品结构改变、Logo 变化、背景闪烁、无意义镜头抖动、突然跳切、重复动作。',
    }
  })

  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0)

  return {
    title: mode === 'script' ? '剧本分镜方案' : '画面导演方案',
    summary: `已将你的内容拆成 ${shots.length} 个可生成镜头，并转换为 ${platforms.find((p) => p.id === recommendedPlatform)?.name} 的提示词结构。`,
    totalDuration,
    recommendedPlatform,
    recommendedModel: model,
    reason: platforms.find((p) => p.id === recommendedPlatform)?.specialty ?? '综合能力均衡',
    shots,
  }
}
