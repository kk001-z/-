import type { CreativeBrief } from '../lib/studio'

export default function StudioBrief({ value, onChange }: { value: CreativeBrief; onChange: (value: CreativeBrief) => void }) {
  const patch = (data: Partial<CreativeBrief>) => onChange({ ...value, ...data, confirmed: false })
  return <section className="studio-section shell" id="brief">
    <div className="studio-heading"><div><span>创作起点</span><h2>先确定你想表达什么</h2></div><p>简报和导演意图随项目保存，换模型时保留。</p></div>
    <div className="studio-form brief-grid">
      <label>内容用途<select value={value.purpose} onChange={e => patch({ purpose: e.target.value })}>{['剧情短片', '产品广告', '人物表演', '风景氛围', '教学演示'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>目标总时长（秒）<input type="number" min="1" max="600" value={value.duration} onChange={e => patch({ duration: Math.max(1, Math.min(600, Number(e.target.value) || 1)) })} /></label>
      <label>画面比例<select value={value.ratio} onChange={e => patch({ ratio: e.target.value })}>{['16:9', '9:16', '1:1', '4:3', '21:9'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>创作自由度<select value={value.freedom} onChange={e => patch({ freedom: e.target.value })}>{['忠实表达', '适度改编', '自由创作'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>目标观众<input value={value.audience} onChange={e => patch({ audience: e.target.value })} placeholder="例如：准备购买产品的新用户" /></label>
      <label>制作优先级<select value={value.priority} onChange={e => patch({ priority: e.target.value })}>{['动作与叙事', '身份一致', '产品准确', '视觉效果', '对白与表演'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="span-wide">观众应该记住什么？<input value={value.message} onChange={e => patch({ message: e.target.value })} placeholder="一句核心信息" /></label>
      <label className="span-wide">必须保留的内容<input value={value.mustKeep} onChange={e => patch({ mustKeep: e.target.value })} placeholder="不可遗漏的画面、信息或剧情" /></label>
    </div>
    <details className="intent-confirm" open><summary>导演意图确认 · {value.confirmed ? '已确认' : '待确认'}</summary>
      <div className="studio-form brief-grid">{([['subject', '主体与关系'], ['environment', '场景与摄影要求'], ['action', '核心动作与先后'], ['ending', '结束画面']] as const).map(([key, label]) => <label key={key}>{label}<textarea value={value[key]} onChange={e => patch({ [key]: e.target.value })} placeholder="留空表示未指定，可在拆镜后继续确认" /></label>)}</div>
      <button className="studio-button" disabled={value.confirmed} onClick={() => onChange({ ...value, confirmed: true })}>{value.confirmed ? '意图已确认' : '确认当前意图'}</button>
    </details>
  </section>
}
