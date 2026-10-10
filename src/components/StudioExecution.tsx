import type { AnalysisResult, GenerationMode } from '../lib/promptEngine'
import type { ProjectAsset } from '../lib/assetStore'
import { capabilities, capabilityWarnings, defaultExecution, executionPack, generationLabels, recommendRoutes } from '../lib/studio'
import { downloadTextFile, safeFilename } from '../lib/export'

export default function StudioExecution({ result, assets, onChange }: { result: AnalysisResult; assets: ProjectAsset[]; onChange: (value: AnalysisResult) => void }) {
  const settings = { ...defaultExecution, ...result.execution }
  const record = capabilities[result.recommendedPlatform]
  return <section className="studio-section" id="execution">
    <div className="studio-heading"><div><span>生成执行</span><h2>选择路线，核对条件</h2></div><button className="studio-button" onClick={() => downloadTextFile(`${safeFilename(result.title)}-执行包.md`, executionPack(result, assets))}>导出生成执行包</button></div>
    <div className="route-options">{recommendRoutes(result).map(route => <button key={route.mode} aria-pressed={result.generationMode === route.mode} className={result.generationMode === route.mode ? 'selected' : ''} onClick={() => onChange({ ...result, generationMode: route.mode as GenerationMode })}><strong>{generationLabels[route.mode]}</strong><span>{route.reason}</span></button>)}</div>
    <div className="studio-form brief-grid">
      <label>实际平台入口<input value={settings.entry} onChange={e => onChange({ ...result, execution: { ...settings, entry: e.target.value } })} placeholder="例如：平台中的参考生成入口名称" /></label>
      <label>镜头组织<select value={settings.organization} onChange={e => onChange({ ...result, execution: { ...settings, organization: e.target.value as 'multi' | 'separate' } })}><option value="separate">逐镜生成后剪辑</option><option value="multi">多镜头一次生成 · 需核验支持</option></select></label>
      <label>声音执行<select value={settings.audio} onChange={e => onChange({ ...result, execution: { ...settings, audio: e.target.value as 'post' | 'native' } })}><option value="post">后期配音 / 音效</option><option value="native">原生音频 · 需核验支持</option></select></label>
      <label>分辨率计划<select value={settings.resolution} onChange={e => onChange({ ...result, execution: { ...settings, resolution: e.target.value } })}>{['平台默认', '480P', '720P', '1080P', '4K'].map(v => <option key={v}>{v}</option>)}</select></label>
      {result.generationMode === 'motion-reference' && <label className="span-wide">动作 / 运镜参考视频文件名或地址<input value={settings.motionReference} onChange={e => onChange({ ...result, execution: { ...settings, motionReference: e.target.value } })} placeholder="执行清单信息；请在目标平台上传视频" /></label>}
      {result.generationMode === 'video-edit' && <label className="span-wide">待编辑 / 延长的原视频<input value={settings.sourceVideo} onChange={e => onChange({ ...result, execution: { ...settings, sourceVideo: e.target.value } })} placeholder="文件名或地址；请在目标平台上传视频" /></label>}
      {(result.generationMode === 'motion-reference' || result.generationMode === 'video-edit') && <label className="span-wide">需要保留的内容<input value={settings.preserve} onChange={e => onChange({ ...result, execution: { ...settings, preserve: e.target.value } })} placeholder="身份、背景、原声音或指定动作片段" /></label>}
    </div>
    <details className="capability-detail"><summary>模型能力资料 · 入口参数待核验</summary><p>{record.scope}</p><p>{record.rule}</p><p>核验日期：{record.checkedAt || '未核验'} · 收录路线：{record.modes.map(m => generationLabels[m]).join('、') || '尚未确认'}</p>{record.source && <a href={record.source} target="_blank" rel="noreferrer">查看官方资料</a>}<p>分辨率、时长、参考数量及特殊语法需按实际入口确认；当前设置作为执行计划，不表示平台一定支持。</p></details>
    <ul className="execution-warnings">{capabilityWarnings(result).map(w => <li key={w}>{w}</li>)}{result.brief && result.totalDuration !== result.brief.duration && <li>目标 {result.brief.duration}s，当前 {result.totalDuration}s。可编辑镜头时长，尚未强制压缩动作。</li>}</ul>
  </section>
}
