import { useState } from 'react'
import type { AnalysisResult } from '../lib/promptEngine'
import { generationLabels, restorePlanVersion, savePlanVersion } from '../lib/studio'

export default function StudioVersions({ result, onChange }: { result: AnalysisResult; onChange: (result: AnalysisResult) => void }) {
  const [label, setLabel] = useState('')
  const [compareId, setCompareId] = useState('')
  const compare = result.versions?.find(v => v.id === compareId)
  return <details className="studio-section"><summary>方案版本与对比 · {result.versions?.length || 0} / 5</summary>
    <div className="version-actions studio-form"><label>版本名称<input value={label} onChange={e => setLabel(e.target.value)} placeholder="例如：减少运镜后的方案" /></label><button className="studio-button" onClick={() => { onChange(savePlanVersion(result, label)); setLabel('') }}>保存当前版本</button></div>
    <div className="version-list">{result.versions?.map(v => <div key={v.id}><span>{v.label} · {new Date(v.createdAt).toLocaleString('zh-CN')}</span><button onClick={() => setCompareId(v.id)}>对比</button><button onClick={() => onChange(restorePlanVersion(result, v.id))}>恢复</button></div>)}</div>
    {compare && <div className="version-compare"><h3>{compare.label} → 当前方案</h3><p>模型：{compare.snapshot.outputModel} → {result.outputModel}；模式：{generationLabels[compare.snapshot.generationMode || 'image-to-video']} → {generationLabels[result.generationMode || 'image-to-video']}；时长：{compare.snapshot.totalDuration}s → {result.totalDuration}s。</p>{result.shots.map((shot, i) => { const old = compare.snapshot.shots[i]; return <div key={shot.id}><strong>镜头 {shot.id}</strong><p>动作：{old?.action || '新增镜头'} → {shot.action}</p><p>运镜：{old?.camera || '无'} → {shot.camera}</p><p>素材：{old?.referenceAssetIds?.length || 0} → {shot.referenceAssetIds?.length || 0} 张</p></div> })}<small>按当前顺序比较；重新排序后请结合镜头标题核对。版本不复制图片文件。</small></div>}
  </details>
}
