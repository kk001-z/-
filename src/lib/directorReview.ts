import type { AnalysisResult, Shot } from './promptEngine'

export interface Finding { kind: '冲突' | '风险' | '缺失'; code: string; evidence: string; advice: string }
export function reviewShot(shot: Shot, mode = 'image-to-video') {
  const text = `${shot.source} ${shot.action}`
  const findings: Finding[] = []
  const add = (code: string, evidence: string, advice: string, kind: Finding['kind'] = '风险') => findings.push({ code, evidence, advice, kind })
  const moves = [...new Set(`${shot.source} ${shot.camera}`.match(/推进|推近|拉远|后退|环绕|跟拍|摇镜|俯冲/g) ?? [])]
  if (moves.length > 2) add('多运镜', moves.join('、'), '确认运动是顺序还是同时发生；按目标入口能力保留复合运镜或拆镜。')
  const camera = `${shot.camera} ${shot.source.match(/(?:固定机位|固定镜头|摄影机固定|镜头静止|固定摄影机)/g)?.join(' ') || ''}`
  if (/固定|静止/.test(camera) && /环绕|跟拍|推进|推近|拉远/.test(shot.camera)) add('运镜冲突', camera, '确认固定机位或移动机位，删除相反描述。', '冲突')
  const actions = [...new Set(text.match(/走进|转身|抬手|跑|跳|拿起|放下|打开|关闭|擦|转头|坐下/g) ?? [])]
  if (actions.length >= 3 && shot.duration < actions.length * 2) add('动作密度', actions.join('、'), '明确动作先后，延长时长或拆镜；不强制将顺序动作判为错误。')
  if (shot.dialogue.length > shot.duration * 5) add('对白时长', `${shot.dialogue.length} 字 / ${shot.duration}s`, '延长镜头或精简对白；按实际配音复核节奏。')
  if (/白天|日光/.test(shot.source) && /夜晚|雨夜|夜景/.test(`${shot.source} ${shot.lighting}`)) add('光线冲突', `${shot.source} / ${shot.lighting}`, '统一时间与照明设定。')
  if (mode === 'reference-to-video' && !shot.referenceAssetIds?.length) add('缺少参考图', '本镜没有绑定参考资产', '在镜头参考图中绑定资产，导出后在目标平台上传。')
  const score = Math.min(100, actions.length * 8 + moves.length * 8 + findings.length * 15)
  return { score, level: score >= 65 ? '高' : score >= 35 ? '中' : '低', findings }
}
export function analyzeIntent(result: AnalysisResult) {
  const extract = (key: keyof Shot) => [...new Set(result.shots.map(s => String(s[key] || '')).filter(Boolean))]
  return [
    { label: '主体与外观', values: extract('subject') },
    { label: '场景与光线', values: extract('environment').concat(extract('lighting')) },
    { label: '动作与叙事', values: extract('action') },
    { label: '摄影与情绪', values: extract('camera').concat(extract('emotion')) },
    { label: '连续性约束', values: extract('continuity') },
  ]
}
