import type { AnalysisResult, Shot } from '../lib/promptEngine'
import type { CharacterBible, ProductBible } from '../lib/projectStore'
import type { ProjectAsset } from '../lib/assetStore'
import { diagnoseFailure, preparationFindings, referenceRoles, type ReferenceRole } from '../lib/studio'
import { reviewShot } from '../lib/directorReview'

export default function StudioShotEditor({ shot, result, characters, products, assets, onChange }: { shot: Shot; result: AnalysisResult; characters: CharacterBible[]; products: ProductBible[]; assets: ProjectAsset[]; onChange: (patch: Partial<Shot>) => void }) {
  const fields = [['purpose', '镜头目的'], ['subject', '主体'], ['environment', '场景'], ['startState', '起始姿态 / 物体状态'], ['action', '动作过程'], ['endState', '结束画面'], ['framing', '景别与机位'], ['camera', '摄影机运动'], ['lighting', '光线'], ['emotion', '情绪'], ['continuity', '本镜固定属性'], ['dialogue', '对白 · 指定说话人'], ['sound', '环境声 / 同步音效'], ['music', '音乐说明']] as const
  const findings = preparationFindings(shot, result, assets)
  const review = reviewShot(shot, result.generationMode)
  return <div className="studio-shot-editor">
    <details open><summary>编辑导演分镜 · 自动重新编译</summary><div className="studio-form shot-field-grid">{fields.map(([key, label]) => <label key={key}>{label}<textarea aria-label={label} value={shot[key] || ''} onChange={e => onChange({ [key]: e.target.value })} /></label>)}</div></details>
    <div className="entity-selection"><strong>本镜出场资产</strong><span>只注入选中资产的固定资料；姿态、位置和表情在本镜字段中描述。</span><div>{[...characters, ...products].map(entity => <label key={entity.id}><input type="checkbox" checked={shot.entityIds?.includes(entity.id) || false} onChange={e => onChange({ entityIds: e.target.checked ? [...(shot.entityIds || []), entity.id] : shot.entityIds?.filter(id => id !== entity.id) })} />{entity.name}</label>)}{!characters.length && !products.length && <small>可在项目资产资料中添加角色或产品。</small>}</div></div>
    {!!shot.referenceAssetIds?.length && <div className="studio-form reference-role-list"><strong>参考素材用途</strong>{shot.referenceAssetIds.map(id => <label key={id}>{assets.find(a => a.id === id)?.name || '素材缺失'}<select value={shot.referenceRoles?.[id] || ''} onChange={e => onChange({ referenceRoles: { ...shot.referenceRoles, [id]: e.target.value as ReferenceRole } })}><option value="">请选择用途</option>{Object.entries(referenceRoles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>)}</div>}
    <div className="preflight-review"><strong>生成前评审 · {review.level}复杂度风险</strong><p>规则评审，不是成功率；未命中不代表没有问题。</p>{[...review.findings, ...findings].map((f, i) => <div key={i} className={`finding finding-${f.kind}`}><b>{f.kind}</b><span>{f.evidence}</span><p>{f.advice}</p></div>)}{!review.findings.length && !findings.length && <p>未发现明显规则问题，请复核素材与目标入口。</p>}</div>
    <details><summary>素材观察与改编依据</summary><div className="studio-form shot-field-grid">{([['observation', '可见事实'], ['inference', '推断 / 为生成而改编'], ['unknown', '无法确认']] as const).map(([key, label]) => <label key={key}>{label}<textarea aria-label={label} value={shot[key] || ''} onChange={e => onChange({ [key]: e.target.value })} placeholder="人工确认，未填写不表示已识别" /></label>)}</div></details>
    <details><summary>生成结果复盘</summary><div className="studio-form"><label>实际问题<textarea value={shot.feedback || ''} onChange={e => onChange({ feedback: e.target.value })} placeholder="例如：产品结构变形，抬手动作未完成" /></label></div>{shot.feedback && <ul>{diagnoseFailure(shot.feedback).map(tip => <li key={tip}>{tip}</li>)}</ul>}</details>
  </div>
}
