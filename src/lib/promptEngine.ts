import { PlatformId, platforms } from './modelCatalog'

export type InputMode = 'idea' | 'script'

export interface DirectorShot {
  id: number
  title: string
  source: string
  duration: number
  framing: string
  camera: string
  emotion: string
  subject: string
  action: string
  environment: string
  lighting: string
  continuity: string
  dialogue: string
  sound: string
  referenceAssetIds?: string[]
}

export interface DirectorPlan {
  title: string
  summary: string
  totalDuration: number
  recommendedPlatform: PlatformId
  recommendedModel: string
  reason: string
  shots: DirectorShot[]
}

export interface Shot extends DirectorShot {
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

  return rough.slice(0, 10)
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

function inferEnvironment(beat: string) {
  if (/河边|钓位|钓鱼/.test(beat)) return '真实河边钓位，水面、草地与钓具关系清楚'
  if (/车里|车内/.test(beat)) return '汽车内部空间，窗外环境与人物位置关系明确'
  if (/城市|街道|霓虹/.test(beat)) return '城市街道环境，空间层次明确'
  if (/房间|室内/.test(beat)) return '真实室内空间，家具与人物动线清楚'
  return '与剧情匹配的真实环境，前中后景关系清楚'
}

function inferLighting(beat: string) {
  if (/雨夜|夜晚|霓虹/.test(beat)) return '夜景低照度，环境光与局部反射形成电影层次'
  if (/白天|阳光|户外|河边/.test(beat)) return '自然日光，主体肤色与产品材质准确'
  return '自然、克制的电影光线，主体与背景分离清晰'
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

function platformPrompt(platform: PlatformId, shot: DirectorShot) {
  const dialogue = shot.dialogue ? `对白：${shot.dialogue}。` : ''
  const sound = shot.sound ? `声音：${shot.sound}。` : ''
  const base = `主体：${shot.subject}。动作：${shot.action}。环境：${shot.environment}。景别：${shot.framing}。运镜：${shot.camera}。光线：${shot.lighting}。情绪：${shot.emotion}。时长约 ${shot.duration} 秒。${dialogue}${sound}`

  switch (platform) {
    case 'kling':
      return `${base} 图生视频时以首帧为唯一外观基准，只描述动作、物理变化与镜头运动。保持主体身份、服装、产品结构、Logo、颜色和场景空间关系稳定。动作连续自然，镜头精准平滑。连续性要求：${shot.continuity}。`
    case 'vidu':
      return `${base} 如果提供多张参考图，将人物、产品和场景分别作为独立参考锚点，优先保持角色与关键物体一致性。不要重新设计已锁定外观。连续性要求：${shot.continuity}。`
    case 'hailuo':
      return `${base} 优先表现人物微表情、眼神、呼吸、身体重心和真实表演节奏。镜头服务于人物状态，避免无意义炫技。连续性要求：${shot.continuity}。`
    case 'wan':
      return `${base} 使用清晰中文因果描述，明确动作先后、空间关系和环境反馈。保证运动自然、背景稳定、不闪烁。连续性要求：${shot.continuity}。`
    case 'libtv':
      return `${base} 作为聚合平台通用视频 Prompt，只描述真正需要发生的动作、镜头与环境变化，并锁定关键主体外观；可优先尝试 Seedance / Wan / MiniMax 中与该镜头最匹配的模型。连续性要求：${shot.continuity}。`
    case 'jimeng':
    case 'xiaoyunque':
    default:
      return `0-${shot.duration}s：${shot.action}。${shot.framing}，${shot.camera}；${shot.environment}，${shot.lighting}。主体保持一致，动作从上一状态自然过渡到下一状态，环境仅发生与剧情有关的真实运动。${dialogue}${sound}连续性要求：${shot.continuity}。`
  }
}

function firstFrame(shot: DirectorShot) {
  return `${shot.subject}处于“${shot.action}”发生前或刚开始的关键瞬间；${shot.environment}；${shot.framing}；${shot.lighting}；情绪为${shot.emotion}。构图明确人物与关键物体位置，前中后景清楚，材质与颜色准确，画面真实克制，为后续动作与运镜保留空间。必须锁定：${shot.continuity}。`
}

function negativePrompt(shot: DirectorShot) {
  const productGuard = /产品|商品|logo|钓箱|耳机|手机|包装/i.test(
    `${shot.subject} ${shot.source}`,
  )
    ? '产品结构、Logo、颜色和材质不得擅自改变；'
    : ''

  return `避免主体变形、五官漂移、手指异常、身份变化、服装跳变、背景闪烁、空间关系错乱、无意义镜头抖动、突然跳切、重复动作；${productGuard}保持镜头前后方向、人物位置与视线连续。`
}

export function compileDirectorPlan(
  plan: DirectorPlan,
  targetPlatform: PlatformId = plan.recommendedPlatform,
): AnalysisResult {
  const platformInfo = platforms.find((p) => p.id === targetPlatform)!
  const shots = plan.shots.map((shot, index) => {
    const normalized: DirectorShot = {
      ...shot,
      id: index + 1,
      duration: Math.max(1, Math.min(12, Math.round(shot.duration || 3))),
    }

    return {
      ...normalized,
      firstFramePrompt: firstFrame(normalized),
      videoPrompt: platformPrompt(targetPlatform, normalized),
      negativePrompt: negativePrompt(normalized),
    }
  })

  return {
    title: plan.title,
    summary: plan.summary,
    totalDuration: shots.reduce((sum, shot) => sum + shot.duration, 0),
    recommendedPlatform: targetPlatform,
    recommendedModel: platformInfo.models[0],
    reason: plan.reason || platformInfo.specialty,
    shots,
  }
}

export function analyze(input: string, mode: InputMode, targetPlatform?: PlatformId): AnalysisResult {
  const beats = splitToBeats(input, mode)
  const source = clean(input)
  const recommendedPlatform = targetPlatform ?? recommendPlatform(source)
  const platformInfo = platforms.find((p) => p.id === recommendedPlatform)!
  const model = modelFor(recommendedPlatform)

  const directorShots: DirectorShot[] = (beats.length ? beats : ['请先输入你想要的画面或剧本']).map((beat, index) => {
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
      subject: beat.replace(/[。！？!?]$/g, ''),
      action: beat.replace(/[。！？!?]$/g, ''),
      environment: inferEnvironment(beat),
      lighting: inferLighting(beat),
      continuity: '保持人物身份、服装、关键道具、产品外观、位置关系与视线方向一致',
      dialogue: /[“”"]/.test(beat) ? beat : '',
      sound: /雨/.test(beat) ? '自然雨声与车内轻微环境声' : '',
    }
  })

  return compileDirectorPlan(
    {
      title: mode === 'script' ? '剧本分镜方案' : '画面导演方案',
      summary: `已将你的内容拆成 ${directorShots.length} 个可生成镜头，并转换为 ${platformInfo.name} 的提示词结构。`,
      totalDuration: directorShots.reduce((sum, shot) => sum + shot.duration, 0),
      recommendedPlatform,
      recommendedModel: model,
      reason: platformInfo.specialty,
      shots: directorShots,
    },
    recommendedPlatform,
  )
}


export function recompileAnalysisResult(
  result: AnalysisResult,
  targetPlatform: PlatformId,
): AnalysisResult {
  const platformInfo = platforms.find((item) => item.id === targetPlatform)!
  const shots: DirectorShot[] = result.shots.map((shot) => ({
    id: shot.id,
    title: shot.title,
    source: shot.source,
    duration: shot.duration,
    framing: shot.framing,
    camera: shot.camera,
    emotion: shot.emotion,
    subject: shot.subject,
    action: shot.action,
    environment: shot.environment,
    lighting: shot.lighting,
    continuity: shot.continuity,
    dialogue: shot.dialogue,
    sound: shot.sound,
    referenceAssetIds: Array.isArray(shot.referenceAssetIds) ? shot.referenceAssetIds : [],
  }))

  return compileDirectorPlan(
    {
      title: result.title,
      summary: result.summary,
      totalDuration: result.totalDuration,
      recommendedPlatform: targetPlatform,
      recommendedModel: platformInfo.models[0],
      reason: platformInfo.specialty,
      shots,
    },
    targetPlatform,
  )
}


export function applyGlobalLocks(
  result: AnalysisResult,
  locks: string,
  targetPlatform: PlatformId = result.recommendedPlatform,
): AnalysisResult {
  const normalizedLocks = locks.trim()
  if (!normalizedLocks) {
    return targetPlatform === result.recommendedPlatform
      ? result
      : recompileAnalysisResult(result, targetPlatform)
  }

  const locked: AnalysisResult = {
    ...result,
    shots: result.shots.map((shot) => ({
      ...shot,
      continuity: shot.continuity.includes(normalizedLocks)
        ? shot.continuity
        : `${shot.continuity}；全局一致性锁：${normalizedLocks}`,
    })),
  }

  return recompileAnalysisResult(locked, targetPlatform)
}


export function reorderAnalysisShots(
  result: AnalysisResult,
  fromIndex: number,
  toIndex: number,
  targetPlatform: PlatformId = result.recommendedPlatform,
): AnalysisResult {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= result.shots.length ||
    toIndex >= result.shots.length
  ) {
    return result
  }

  const shots = [...result.shots]
  const [moved] = shots.splice(fromIndex, 1)
  shots.splice(toIndex, 0, moved)

  const normalized: AnalysisResult = {
    ...result,
    shots: shots.map((shot, index) => ({
      ...shot,
      id: index + 1,
    })),
  }

  return recompileAnalysisResult(normalized, targetPlatform)
}

export function replaceAnalysisShot(
  result: AnalysisResult,
  shotId: number,
  replacement: Shot,
  targetPlatform: PlatformId = result.recommendedPlatform,
): AnalysisResult {
  const shots = result.shots.map((shot) =>
    shot.id === shotId
      ? {
          ...replacement,
          id: shot.id,
          referenceAssetIds:
            replacement.referenceAssetIds?.length
              ? replacement.referenceAssetIds
              : shot.referenceAssetIds ?? [],
        }
      : shot,
  )

  const normalized: AnalysisResult = {
    ...result,
    shots,
  }

  return recompileAnalysisResult(normalized, targetPlatform)
}


export function deleteAnalysisShot(
  result: AnalysisResult,
  shotId: number,
  targetPlatform: PlatformId = result.recommendedPlatform,
): AnalysisResult {
  if (result.shots.length <= 1) return result

  const normalized: AnalysisResult = {
    ...result,
    shots: result.shots
      .filter((shot) => shot.id !== shotId)
      .map((shot, index) => ({ ...shot, id: index + 1 })),
  }

  return recompileAnalysisResult(normalized, targetPlatform)
}

export function duplicateAnalysisShot(
  result: AnalysisResult,
  shotId: number,
  targetPlatform: PlatformId = result.recommendedPlatform,
): AnalysisResult {
  const index = result.shots.findIndex((shot) => shot.id === shotId)
  if (index < 0 || result.shots.length >= 20) return result

  const shots = [...result.shots]
  const source = shots[index]
  shots.splice(index + 1, 0, {
    ...source,
    title: `${source.title} · Copy`,
  })

  const normalized: AnalysisResult = {
    ...result,
    shots: shots.map((shot, shotIndex) => ({
      ...shot,
      id: shotIndex + 1,
    })),
  }

  return recompileAnalysisResult(normalized, targetPlatform)
}

export function updateAnalysisShotDuration(
  result: AnalysisResult,
  shotId: number,
  duration: number,
  targetPlatform: PlatformId = result.recommendedPlatform,
): AnalysisResult {
  const safeDuration = Math.max(1, Math.min(12, Math.round(duration || 1)))
  const normalized: AnalysisResult = {
    ...result,
    shots: result.shots.map((shot) =>
      shot.id === shotId ? { ...shot, duration: safeDuration } : shot,
    ),
  }

  return recompileAnalysisResult(normalized, targetPlatform)
}


export function updateAnalysisShotAssets(
  result: AnalysisResult,
  shotId: number,
  referenceAssetIds: string[],
): AnalysisResult {
  return {
    ...result,
    shots: result.shots.map((shot) =>
      shot.id === shotId
        ? { ...shot, referenceAssetIds: [...new Set(referenceAssetIds)] }
        : shot,
    ),
  }
}
