import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  FileText,
  Film,
  ImagePlus,
  Layers3,
  Play,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { analyze, AnalysisResult, InputMode } from './lib/promptEngine'
import { defaultPlatform, PlatformId, platforms } from './lib/modelCatalog'

const ideaExample = '一个女生坐在车里，看着窗外下雨。她抬手擦去车窗上的雾气，看到远处霓虹灯。镜头从侧面慢慢推进，最后停在她的眼神特写。'
const scriptExample = `镜头一：男生走进河边钓位，看见朋友靠在钓箱上闭着眼。
男生：“你不是来钓鱼的吗？”
朋友睁眼看他：“鱼不上班，我先下班。”
最后给钓箱靠背和坐垫一个产品特写。`

function App() {
  const [mode, setMode] = useState<InputMode>('idea')
  const [platform, setPlatform] = useState<PlatformId>(defaultPlatform)
  const [input, setInput] = useState(ideaExample)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [copied, setCopied] = useState('')

  const currentPlatform = useMemo(
    () => platforms.find((item) => item.id === platform)!,
    [platform],
  )

  function runAnalysis() {
    if (!input.trim()) return
    setResult(analyze(input, mode, platform))
    setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(''), 1200)
  }

  function changeMode(next: InputMode) {
    setMode(next)
    setInput(next === 'idea' ? ideaExample : scriptExample)
    setResult(null)
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Clapperboard size={18} /></div>
          <span>FramePilot</span>
          <span className="beta">CN · VIDEO AI</span>
        </div>
        <div className="nav-note">AI 导演 · 分镜 · Prompt Adapter</div>
      </header>

      <section className="hero shell">
        <div className="eyebrow"><Sparkles size={14} /> 把“人话”编译成 AI 视频生成方案</div>
        <h1>你负责想象，<br /><span>剩下的交给 AI 导演。</span></h1>
        <p className="hero-copy">
          描述一个画面，或者直接粘贴剧本。系统自动拆镜、判断景别与运镜，
          再转换成小云雀、即梦、可灵、LibTV、Vidu、海螺与万相可用的提示词。
        </p>
      </section>

      <section className="workspace shell">
        <div className="composer card">
          <div className="mode-tabs">
            <button className={mode === 'idea' ? 'active' : ''} onClick={() => changeMode('idea')}>
              <WandSparkles size={16} /> 我有一个画面
            </button>
            <button className={mode === 'script' ? 'active' : ''} onClick={() => changeMode('script')}>
              <FileText size={16} /> 我有一段剧本
            </button>
          </div>

          <div className="field-head">
            <label>{mode === 'idea' ? '告诉导演你想看到什么' : '粘贴你的剧本 / 文案 / 分镜草稿'}</label>
            <span>{input.length} 字</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：一个男生在雨夜骑摩托穿过城市，镜头贴近车身低机位跟拍……"
          />

          <div className="upload-row">
            <button className="ghost"><ImagePlus size={16} /> 添加参考图 <span>即将支持</span></button>
            <button className="ghost"><Film size={16} /> 添加参考视频 <span>即将支持</span></button>
          </div>

          <div className="field-head platform-title">
            <label>输出到哪个平台？</label>
            <span>平台决定提示词写法</span>
          </div>

          <div className="platform-grid">
            {platforms.map((item) => (
              <button
                key={item.id}
                onClick={() => setPlatform(item.id)}
                className={platform === item.id ? 'platform active' : 'platform'}
              >
                <strong>{item.short}</strong>
                <small>{item.models[0]}</small>
              </button>
            ))}
          </div>

          <div className="selected-model">
            <div>
              <span>当前适配</span>
              <strong>{currentPlatform.name} · {currentPlatform.models[0]}</strong>
            </div>
            <ChevronDown size={18} />
          </div>

          <button className="primary" onClick={runAnalysis}>
            <Sparkles size={18} />
            AI 导演分析
            <ArrowRight size={18} />
          </button>
        </div>

        <aside className="side card">
          <div className="side-title"><Layers3 size={18} /> 它会替你做什么？</div>
          <div className="step"><span>01</span><div><strong>理解内容</strong><p>找出人物、场景、动作、产品、对白与情绪。</p></div></div>
          <div className="step"><span>02</span><div><strong>导演拆镜</strong><p>自动决定镜头数量、景别、运镜、节奏和时长。</p></div></div>
          <div className="step"><span>03</span><div><strong>生成首帧</strong><p>每个镜头先得到一条文生图 Prompt。</p></div></div>
          <div className="step"><span>04</span><div><strong>转换视频 Prompt</strong><p>只描述该模型真正需要理解的运动与变化。</p></div></div>
          <div className="step"><span>05</span><div><strong>平台适配</strong><p>同一个镜头，自动改写成不同平台的语言。</p></div></div>
        </aside>
      </section>

      {result && (
        <section className="results shell" id="result">
          <div className="result-head">
            <div>
              <div className="eyebrow"><Check size={14} /> DIRECTOR ANALYSIS COMPLETE</div>
              <h2>{result.title}</h2>
              <p>{result.summary}</p>
            </div>
            <div className="meta-pills">
              <span>{result.shots.length} 镜头</span>
              <span>约 {result.totalDuration}s</span>
              <span>{result.recommendedModel}</span>
            </div>
          </div>

          <div className="recommendation">
            <div className="recommend-icon"><Play size={18} /></div>
            <div>
              <span>当前输出模型</span>
              <strong>{currentPlatform.name} · {result.recommendedModel}</strong>
              <p>{result.reason}</p>
            </div>
          </div>

          <div className="shot-list">
            {result.shots.map((shot) => (
              <article className="shot-card" key={shot.id}>
                <div className="shot-index">SHOT {String(shot.id).padStart(2, '0')}</div>
                <div className="shot-main">
                  <div className="shot-title-row">
                    <div>
                      <h3>{shot.title}</h3>
                      <p className="source-line">{shot.source}</p>
                    </div>
                    <span className="duration">{shot.duration}s</span>
                  </div>

                  <div className="director-tags">
                    <span>{shot.framing}</span>
                    <span>{shot.camera}</span>
                    <span>{shot.emotion}</span>
                  </div>

                  <PromptBlock
                    title="首帧 / 文生图 Prompt"
                    value={shot.firstFramePrompt}
                    copyKey={`frame-${shot.id}`}
                    copied={copied}
                    onCopy={copyText}
                  />
                  <PromptBlock
                    title={`${currentPlatform.short} · 图生视频 Prompt`}
                    value={shot.videoPrompt}
                    copyKey={`video-${shot.id}`}
                    copied={copied}
                    onCopy={copyText}
                    accent
                  />
                  <details>
                    <summary>负面约束 / 稳定性控制</summary>
                    <p>{shot.negativePrompt}</p>
                  </details>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="shell footer">
        <span>FramePilot V0.1</span>
        <span>中国 AI 视频创作者的 Prompt Compiler</span>
      </footer>
    </main>
  )
}

function PromptBlock({
  title,
  value,
  copyKey,
  copied,
  onCopy,
  accent = false,
}: {
  title: string
  value: string
  copyKey: string
  copied: string
  onCopy: (key: string, value: string) => void
  accent?: boolean
}) {
  return (
    <div className={accent ? 'prompt-block accent' : 'prompt-block'}>
      <div className="prompt-head">
        <span>{title}</span>
        <button onClick={() => onCopy(copyKey, value)}>
          {copied === copyKey ? <Check size={14} /> : <Copy size={14} />}
          {copied === copyKey ? '已复制' : '复制'}
        </button>
      </div>
      <p>{value}</p>
    </div>
  )
}

export default App
