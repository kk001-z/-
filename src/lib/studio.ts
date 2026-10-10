import type { AnalysisResult, GenerationMode, Shot } from './promptEngine'
import { configureGeneration } from './promptEngine'
import { platforms, type PlatformId } from './modelCatalog'
import type { CharacterBible, ProductBible } from './projectStore'
import { buildBibleLocks } from './projectStore'
import type { ProjectAsset } from './assetStore'

export interface CreativeBrief {
  purpose: string; audience: string; message: string; mustKeep: string; freedom: string
  duration: number; ratio: string; priority: string; confirmed: boolean
  subject: string; environment: string; action: string; ending: string
}
export const defaultBrief: CreativeBrief = { purpose: '剧情短片', audience: '', message: '', mustKeep: '', freedom: '忠实表达', duration: 15, ratio: '16:9', priority: '动作与叙事', confirmed: false, subject: '', environment: '', action: '', ending: '' }
export function normalizeBrief(raw?: Partial<CreativeBrief>): CreativeBrief {
  const value = { ...defaultBrief, ...raw }
  return { ...value, duration: Number.isFinite(value.duration) ? Math.max(1, Math.min(600, value.duration)) : 15 }
}
export function briefContext(brief: CreativeBrief) {
  return `创作简报：用途=${brief.purpose}；观众=${brief.audience}；核心信息=${brief.message}；必须保留=${brief.mustKeep}；改编程度=${brief.freedom}；目标时长=${brief.duration}s；画幅=${brief.ratio}；优先级=${brief.priority}。导演意图：主体=${brief.subject}；场景=${brief.environment}；动作=${brief.action}；结尾=${brief.ending}。空字段表示未指定，不得当成已确认事实。`
}
export type ReferenceRole = 'identity' | 'product' | 'scene' | 'style' | 'composition' | 'first-frame' | 'last-frame'
export const referenceRoles: Record<ReferenceRole, string> = { identity: '人物身份', product: '产品结构', scene: '场景', style: '风格', composition: '构图', 'first-frame': '首帧', 'last-frame': '尾帧' }
export const generationLabels: Record<GenerationMode, string> = { 'text-to-video': '文生视频', 'image-to-video': '首帧图生视频', 'reference-to-video': '多参考生成', 'first-last-frame': '首尾帧生成', 'motion-reference': '动作 / 运镜参考', 'video-edit': '视频编辑 / 延长' }
export interface ExecutionSettings { entry: string; audio: 'post' | 'native'; resolution: string; organization: 'separate' | 'multi'; motionReference: string; sourceVideo: string; preserve: string }
export const defaultExecution: ExecutionSettings = { entry: '', audio: 'post', resolution: '平台默认', organization: 'separate', motionReference: '', sourceVideo: '', preserve: '' }
export interface CapabilityRecord { source: string; checkedAt: string; scope: string; modes: GenerationMode[]; audio: boolean | null; multi: boolean | null; rule: string }
const seed = { source: 'https://seed.bytedance.com/en/seedance2_0/', checkedAt: '2026-10-10', scope: '官方模型家族资料；具体平台入口参数待核验', modes: ['text-to-video', 'image-to-video', 'reference-to-video', 'motion-reference', 'video-edit'] as GenerationMode[], audio: true, multi: null, rule: '明确各参考素材的用途；不要将风格参考当成主体身份参考。' }
export const capabilities: Record<PlatformId, CapabilityRecord> = {
  xiaoyunque: seed, jimeng: seed,
  kling: { source: 'https://ir.kuaishou.com/news-releases/news-release-details/kling-ai-launches-30-model-ushering-era-where-everyone-can-be', checkedAt: '2026-10-10', scope: '官方 3.0 家族公告；具体入口参数待核验', modes: ['text-to-video', 'image-to-video', 'reference-to-video'], audio: true, multi: true, rule: '多镜头用独立镜头段组织；对白指定说话人。具体所选型号需确认入口。' },
  vidu: { source: 'https://platform.vidu.com/docs/overview/function-list', checkedAt: '2026-10-10', scope: '官方平台功能表；所选型号与接口参数待核验', modes: ['text-to-video', 'image-to-video', 'reference-to-video', 'first-last-frame', 'video-edit'], audio: null, multi: null, rule: '明确主体 / 场景参考对应关系；首尾帧描述两帧之间的变化。' },
  wan: { source: 'https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/', checkedAt: '2026-10-10', scope: '官方家族及入口目录；具体型号与区域参数待核验', modes: ['text-to-video', 'image-to-video', 'reference-to-video', 'first-last-frame', 'video-edit'], audio: true, multi: null, rule: '按模式选择对应入口；明确动作先后、空间关系及起止状态。' },
  hailuo: { source: 'https://github.com/MiniMax-AI/skills/blob/main/skills/frontend-dev/references/minimax-video-guide.md', checkedAt: '2026-10-10', scope: '保留适配，具体型号、参数与能力待核验', modes: [], audio: null, multi: null, rule: '输出通用摄影描述，不自动插入未核验的专用运镜语法。' },
  libtv: { source: '', checkedAt: '', scope: '聚合平台：需先确认实际模型与入口', modes: [], audio: null, multi: null, rule: '保留通用导演方案；执行参数以实际选用的模型为准。' },
}
export function capabilityWarnings(result: AnalysisResult): string[] {
  const record = capabilities[result.recommendedPlatform]
  const settings = { ...defaultExecution, ...result.execution }
  const messages = ['所选型号及平台入口参数尚未完成逐项核验；本方案为可编辑执行草案。']
  if (result.outputModel && !['Seedance 2.0', 'Kling 3.0', 'Vidu Q3'].includes(result.outputModel)) messages.push('当前模型采用通用编译，版本专用规则待核验，不自动插入专用语法。')
  if (!settings.entry.trim()) messages.push('请填写实际生成入口名称。')
  if (!record.modes.includes(result.generationMode || 'image-to-video')) messages.push('当前路线未在已收录资料中确认，执行前需核验入口支持。')
  if (settings.audio === 'native' && record.audio !== true) messages.push('原生音频能力未确认，建议导出后期声音说明。')
  if (settings.organization === 'multi' && record.multi !== true) messages.push('多镜头一次生成能力未确认，可选择逐镜生成后剪辑。')
  if (result.generationMode === 'motion-reference' && !settings.motionReference.trim()) messages.push('缺少动作 / 运镜参考视频说明。')
  if (result.generationMode === 'video-edit' && !settings.sourceVideo.trim()) messages.push('缺少待编辑 / 延长的原视频说明。')
  return messages
}
export function recommendRoutes(result: AnalysisResult) {
  const references = result.shots.some(s => s.referenceAssetIds?.length)
  return [
    { mode: 'text-to-video' as GenerationMode, reason: '无素材时先探索画面；完整描述外观、空间及动作。' },
    { mode: 'image-to-video' as GenerationMode, reason: '需要确定起始构图与外观时，先制作并上传首帧。' },
    { mode: 'reference-to-video' as GenerationMode, reason: references ? '已有绑定素材；核对每份素材的用途及目标入口支持。' : '需要身份或产品参考时使用；当前仍需绑定素材。' },
    { mode: 'first-last-frame' as GenerationMode, reason: '起点与终点均明确时使用；需要两帧并检查过渡可行性。' },
    { mode: 'motion-reference' as GenerationMode, reason: '需要借用运动特征时使用；在执行设置中填写参考视频。' },
    { mode: 'video-edit' as GenerationMode, reason: '已有视频需要改动或延长时使用；明确保留内容和修改范围。' },
  ]
}
export function scopeShot(shot: Shot, characters: CharacterBible[], products: ProductBible[]): Shot {
  const ids = shot.entityIds ?? []
  return { ...shot, scopedLocks: buildBibleLocks(characters.filter(c => ids.includes(c.id)), products.filter(p => ids.includes(p.id))) }
}
export function compileStudio(result: AnalysisResult, characters: CharacterBible[], products: ProductBible[]): AnalysisResult {
  return configureGeneration({ ...result, shots: result.shots.map(s => scopeShot(s, characters, products)) }, result.outputModel, result.generationMode)
}
export function initializeStudio(result: AnalysisResult, brief: CreativeBrief, execution: ExecutionSettings): AnalysisResult {
  return { ...result, brief: { ...brief }, execution: { ...execution }, shots: result.shots.map((shot, index) => ({ ...shot, purpose: shot.purpose || (index === 0 ? '建立场景与主体' : '推进动作或情绪'), startState: shot.startState || '', endState: shot.endState || '', entityIds: shot.entityIds || [], referenceRoles: shot.referenceRoles || {}, observation: shot.observation || '', inference: shot.inference || '', unknown: shot.unknown || '', feedback: '' })) }
}
export interface PreparationFinding { kind: '冲突' | '风险' | '缺失'; evidence: string; advice: string }
export function preparationFindings(shot: Shot, result: AnalysisResult, assets: ProjectAsset[]): PreparationFinding[] {
  const findings: PreparationFinding[] = []
  const bound = (shot.referenceAssetIds ?? []).filter(id => assets.some(a => a.id === id))
  const roles = shot.referenceRoles ?? {}
  const has = (role: ReferenceRole) => bound.some(id => roles[id] === role)
  if (!shot.startState?.trim()) findings.push({ kind: '缺失', evidence: '起始姿态 / 物体状态未确认', advice: '描述动作发生前的确定画面，检查手、道具和运动空间。' })
  if (!shot.endState?.trim()) findings.push({ kind: '缺失', evidence: '结束画面未确认', advice: '填写动作结果及镜头最后停留位置。' })
  if (result.generationMode === 'image-to-video' && !has('first-frame')) findings.push({ kind: '缺失', evidence: '未绑定首帧', advice: '先生成或上传首帧，在素材用途中指定“首帧”。' })
  if (result.generationMode === 'first-last-frame' && (!has('first-frame') || !has('last-frame'))) findings.push({ kind: '缺失', evidence: '首尾帧不完整', advice: '分别绑定首帧和尾帧，确认主体及空间一致。' })
  if (result.generationMode === 'reference-to-video' && !bound.length) findings.push({ kind: '缺失', evidence: '没有可用参考素材', advice: '上传并绑定人物、产品或场景参考图。' })
  if (bound.some(id => !roles[id])) findings.push({ kind: '缺失', evidence: '参考图用途未指定', advice: '为每份素材选择用途，避免错误继承外观或风格。' })
  if (bound.filter(id => roles[id] === 'first-frame').length > 1 || bound.filter(id => roles[id] === 'last-frame').length > 1) findings.push({ kind: '冲突', evidence: '同一镜头绑定了多个首帧或尾帧', advice: '保留一个确定的起点和终点，其余素材改为身份、风格或构图参考。' })
  const next = result.shots[result.shots.indexOf(shot) + 1]
  if (next && shot.endState && next.startState && shot.endState !== next.startState) findings.push({ kind: '风险', evidence: `下一镜起始状态：${next.startState}`, advice: '两镜状态描述不同；确认是连续衔接还是有意跳切。' })
  return findings
}
export function diagnoseFailure(problem: string): string[] {
  const tips: string[] = []
  if (/身份|脸|外观|漂移/.test(problem)) tips.push('确认每镜引用同一身份参考，移除互相矛盾的外观描述。')
  if (/产品|logo|结构|变形/i.test(problem)) tips.push('核对产品参考与可见角度；减少遮挡或复杂交互，必要时单独制作产品展示镜头。')
  if (/动作|手|物理|接触/.test(problem)) tips.push('明确起始姿态、接触对象、动作先后与结束状态；检查首帧是否支持目标动作。')
  if (/运镜|镜头|构图/.test(problem)) tips.push('分开主体运动和摄影机运动，移除相反指令，核验入口是否支持对应控制。')
  if (/对白|声音|音频|口型/.test(problem)) tips.push('指定说话人、文本、语气与时长；核验音频能力，必要时改为后期配音。')
  return tips.length ? tips : ['先定位意图、素材、参数或入口能力问题；每次只修改一个关键条件，并记录结果。']
}
export function executionPack(result: AnalysisResult, assets: ProjectAsset[]) {
  const settings = { ...defaultExecution, ...result.execution }
  const profile = capabilities[result.recommendedPlatform]
  const lines = [`# ${result.title} · 生成执行包`, '', `平台：${platforms.find(p => p.id === result.recommendedPlatform)?.name}`, `模型：${result.outputModel || result.recommendedModel}`, `入口：${settings.entry || '待确认'}`, `路线：${generationLabels[result.generationMode || 'image-to-video']}`, `画幅：${result.brief?.ratio || '未指定'}；目标总时长：${result.brief?.duration || '未指定'}s；实际分镜：${result.totalDuration}s`, `分辨率：${settings.resolution}；组织：${settings.organization === 'multi' ? '多镜头一次生成（需核验）' : '逐镜生成后剪辑'}；声音：${settings.audio === 'native' ? '原生音频（需核验）' : '后期制作'}`, `资料来源：${profile.source || '未收录'}；核验范围：${profile.scope}`, '', '## 执行前确认', ...capabilityWarnings(result).map(s => `- ${s}`), '', '## 创作简报与导演意图', result.brief ? briefContext(result.brief) : '未填写', '', '说明：此包不包含图片或视频文件；用项目 JSON 可备份图片资产。通用稳定性说明不等于目标模型支持负面提示词。']
  result.shots.forEach(shot => {
    lines.push('', `## SHOT ${shot.id} · ${shot.title}`, `目的：${shot.purpose || '未确认'}`, `时长：${shot.duration}s`, `起始：${shot.startState || '待确认'}`, `结束：${shot.endState || '待确认'}`, '', '### 所需素材与对应关系')
    if (!shot.referenceAssetIds?.length) lines.push('- 未绑定图片素材')
    shot.referenceAssetIds?.forEach((id, i) => { const asset = assets.find(a => a.id === id); lines.push(`- 素材 ${i + 1}：${asset?.name || '缺失素材'}；用途：${referenceRoles[shot.referenceRoles?.[id] as ReferenceRole] || '待指定'}；请按目标入口映射素材标记。`) })
    lines.push(...preparationFindings(shot, result, assets).map(f => `- [${f.kind}] ${f.evidence}；${f.advice}`), '', '### 首帧描述', shot.firstFramePrompt, '', '### 视频提示词', shot.videoPrompt, '', '### 声音执行说明', `对白：${shot.dialogue || '无'}；环境声 / 音效：${shot.sound || '无'}；音乐：${shot.music || '无'}`, `声音方式：${settings.audio === 'native' ? '核实原生支持后随视频执行' : '后期制作，不注入视频提示词'}`, '', '### 复盘', shot.feedback || '未记录', ...diagnoseFailure(shot.feedback || '').map(t => `- ${t}`))
  })
  return lines.join('\n')
}

export function savePlanVersion(result: AnalysisResult, label: string): AnalysisResult {
  const { versions: _versions, ...snapshot } = result
  const entry = { id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: label.trim() || '未命名版本', createdAt: Date.now(), snapshot: structuredClone(snapshot) }
  return { ...result, versions: [...(result.versions || []).slice(-4), entry] }
}
export function restorePlanVersion(result: AnalysisResult, id: string): AnalysisResult {
  const version = result.versions?.find(v => v.id === id)
  return version ? { ...structuredClone(version.snapshot), versions: result.versions } : result
}

export function remapResultAssets(result: AnalysisResult, map: Map<string, string>): AnalysisResult {
  const remap = (shot: Shot): Shot => ({ ...shot,
    referenceAssetIds: (shot.referenceAssetIds || []).map(id => map.get(id)).filter((id): id is string => !!id),
    referenceRoles: Object.fromEntries(Object.entries(shot.referenceRoles || {}).filter(([id]) => map.has(id)).map(([id, role]) => [map.get(id)!, role])),
  })
  return { ...result, shots: result.shots.map(remap), versions: result.versions?.map(v => ({ ...v, snapshot: { ...v.snapshot, shots: v.snapshot.shots.map(remap) } })) }
}
