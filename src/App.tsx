import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  ClipboardCopy,
  Copy,
  Download,
  FileJson,
  FileText,
  Film,
  ImagePlus,
  Images,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Play,
  ScanSearch,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  applyGlobalLocks,
  reorderAnalysisShots,
  replaceAnalysisShot,
  recompileAnalysisResult,
  type AnalysisResult,
  type InputMode,
  type Shot,
} from './lib/promptEngine'
import {
  analyzeReferenceWithDirector,
  analyzeWithDirector,
  regenerateShotWithDirector,
} from './lib/directorApi'
import { defaultPlatform, type PlatformId, platforms } from './lib/modelCatalog'
import {
  formatBytes,
  formatDuration,
  prepareReference,
  type PreparedReference,
} from './lib/media'
import {
  downloadTextFile,
  safeFilename,
  storyboardToMarkdown,
  storyboardToPlainText,
} from './lib/export'
import {
  buildBibleLocks,
  createProject,
  loadActiveProjectId,
  loadProjects,
  saveActiveProjectId,
  saveProjects,
  type CharacterBible,
  type FramePilotProject,
  type ProductBible,
} from './lib/projectStore'
import BiblePanel from './components/BiblePanel'
import ProjectBar from './components/ProjectBar'
import StoryTimeline from './components/StoryTimeline'

type WorkspaceMode = InputMode | 'reference'
type EngineState = 'ai' | 'local' | null

interface PersistedWorkspace {
  mode: WorkspaceMode
  platform: PlatformId
  input: string
  result: AnalysisResult | null
  engine: EngineState
  engineModel: string
  locks: string
  projectName?: string
  characters?: CharacterBible[]
  products?: ProductBible[]
}

const STORAGE_KEY = 'framepilot.workspace.v0.4'
const ideaExample = '一个女生坐在车里，看着窗外下雨。她抬手擦去车窗上的雾气，看到远处霓虹灯。镜头从侧面慢慢推进，最后停在她的眼神特写。'
const scriptExample = `镜头一：男生走进河边钓位，看见朋友靠在钓箱上闭着眼。
男生：“你不是来钓鱼的吗？”
朋友睁眼看他：“鱼不上班，我先下班。”
最后给钓箱靠背和坐垫一个产品特写。`
const referenceExample = '例如：重点复刻这个视频的运镜和节奏，但把主体替换成我的产品。'

function App() {
  const [mode, setMode] = useState<WorkspaceMode>('idea')
  const [platform, setPlatform] = useState<PlatformId>(defaultPlatform)
  const [input, setInput] = useState(ideaExample)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [copied, setCopied] = useState('')
  const [loading, setLoading] = useState(false)
  const [engine, setEngine] = useState<EngineState>(null)
  const [engineModel, setEngineModel] = useState('')
  const [locks, setLocks] = useState('')
  const [notice, setNotice] = useState('')
  const [reference, setReference] = useState<PreparedReference | null>(null)
  const [preparingReference, setPreparingReference] = useState(false)
  const [referenceProgress, setReferenceProgress] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const [projects, setProjects] = useState<FramePilotProject[]>([])
  const [activeProjectId, setActiveProjectId] = useState('')
  const [projectName, setProjectName] = useState('未命名项目')
  const [characters, setCharacters] = useState<CharacterBible[]>([])
  const [products, setProducts] = useState<ProductBible[]>([])
  const [regeneratingShotId, setRegeneratingShotId] = useState<number | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const currentPlatform = useMemo(
    () => platforms.find((item) => item.id === platform)!,
    [platform],
  )

  const bibleLocks = useMemo(
    () => buildBibleLocks(characters, products),
    [characters, products],
  )

  const effectiveLocks = useMemo(
    () => [locks.trim(), bibleLocks.trim()].filter(Boolean).join('；'),
    [locks, bibleLocks],
  )

  const canRun = mode === 'reference' ? Boolean(reference) : Boolean(input.trim())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedWorkspace>
        const validMode = saved.mode === 'idea' || saved.mode === 'script' || saved.mode === 'reference'
        const validPlatform = platforms.some((item) => item.id === saved.platform)

        if (validMode && saved.mode) setMode(saved.mode)
        if (validPlatform && saved.platform) setPlatform(saved.platform)
        if (typeof saved.input === 'string') setInput(saved.input)
        if (saved.result && typeof saved.result === 'object') setResult(saved.result as AnalysisResult)
        if (saved.engine === 'ai' || saved.engine === 'local') setEngine(saved.engine)
        if (typeof saved.engineModel === 'string') setEngineModel(saved.engineModel)
        if (typeof saved.locks === 'string') setLocks(saved.locks)
        if (typeof saved.projectName === 'string') setProjectName(saved.projectName)
        if (Array.isArray(saved.characters)) setCharacters(saved.characters)
        if (Array.isArray(saved.products)) setProducts(saved.products)
      }

      const storedProjects = loadProjects()
      setProjects(storedProjects)

      const storedActiveId = loadActiveProjectId()
      const activeProject = storedProjects.find((item) => item.id === storedActiveId)
      if (activeProject) {
        applyProject(activeProject)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    const payload: PersistedWorkspace = {
      mode,
      platform,
      input,
      result,
      engine,
      engineModel,
      locks,
      projectName,
      characters,
      products,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore storage quota/private mode failures.
    }
  }, [
    hydrated,
    mode,
    platform,
    input,
    result,
    engine,
    engineModel,
    locks,
    projectName,
    characters,
    products,
  ])

  function applyProject(project: FramePilotProject) {
    setActiveProjectId(project.id)
    saveActiveProjectId(project.id)
    setProjectName(project.name)
    setPlatform(project.platform)
    setInput(project.input || ideaExample)
    setLocks(project.locks || '')
    setCharacters(project.characters || [])
    setProducts(project.products || [])
    setResult(project.result || null)
    setReference(null)
    setNotice(`已打开项目「${project.name}」。`)
  }

  function saveCurrentProject() {
    const now = Date.now()
    const existing = projects.find((item) => item.id === activeProjectId)
    const base = existing ?? createProject(projectName.trim() || '未命名项目')

    const nextProject: FramePilotProject = {
      ...base,
      name: projectName.trim() || '未命名项目',
      updatedAt: now,
      platform,
      input,
      locks,
      characters,
      products,
      result,
    }

    const nextProjects = existing
      ? projects.map((item) => (item.id === existing.id ? nextProject : item))
      : [nextProject, ...projects]

    setProjects(nextProjects)
    saveProjects(nextProjects)
    setActiveProjectId(nextProject.id)
    saveActiveProjectId(nextProject.id)
    setNotice(`项目「${nextProject.name}」已保存到当前浏览器。`)
  }

  function createNewProject() {
    const project = createProject('未命名项目')
    setActiveProjectId(project.id)
    saveActiveProjectId(project.id)
    setProjectName(project.name)
    setMode('idea')
    setPlatform(defaultPlatform)
    setInput(ideaExample)
    setLocks('')
    setCharacters([])
    setProducts([])
    setResult(null)
    setReference(null)
    setEngine(null)
    setEngineModel('')
    setNotice('已创建新项目。填写内容后点击“保存项目”。')
  }

  function deleteProject(id: string) {
    const nextProjects = projects.filter((item) => item.id !== id)
    setProjects(nextProjects)
    saveProjects(nextProjects)

    if (activeProjectId === id) {
      const next = nextProjects[0]
      if (next) {
        applyProject(next)
      } else {
        setActiveProjectId('')
        saveActiveProjectId('')
        setProjectName('未命名项目')
        setCharacters([])
        setProducts([])
        setResult(null)
        setNotice('项目已删除。')
      }
    }
  }

  async function runAnalysis() {
    if (!canRun || loading || preparingReference) return

    setLoading(true)
    setNotice('')

    try {
      const response =
        mode === 'reference' && reference
          ? await analyzeReferenceWithDirector(reference, platform, input.trim(), effectiveLocks)
          : await analyzeWithDirector(input, mode as InputMode, platform, effectiveLocks)

      setResult(response.result)
      setEngine(response.engine)
      setEngineModel(response.model ?? '')
      setNotice(response.notice ?? '')
      setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }), 80)
    } catch (error) {
      setResult(null)
      setEngine(null)
      setNotice(error instanceof Error ? error.message : '分析失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  async function regenerateShot(shot: Shot) {
    if (!result || regeneratingShotId !== null) return

    setRegeneratingShotId(shot.id)
    setNotice('')

    try {
      const response = await regenerateShotWithDirector(
        shot,
        platform,
        effectiveLocks,
        input.trim(),
        '保持当前镜头的剧情功能，优化镜头设计、动作可执行性和生成稳定性。',
      )
      setResult(replaceAnalysisShot(result, shot.id, response.shot, platform))
      setEngine('ai')
      if (response.model) setEngineModel(response.model)
      setNotice(`SHOT ${String(shot.id).padStart(2, '0')} 已单独重生成，其他镜头未重新调用 AI。`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '单镜重生成失败。')
    } finally {
      setRegeneratingShotId(null)
    }
  }

  function reorderShots(fromIndex: number, toIndex: number) {
    if (!result) return
    setResult(reorderAnalysisShots(result, fromIndex, toIndex, platform))
    setNotice('镜头顺序已调整，并已重新计算编号与时间轴。')
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(''), 1200)
  }

  async function copyAllPrompts() {
    if (!result) return
    await copyText('all', storyboardToPlainText(result, currentPlatform.name))
  }

  function exportMarkdown() {
    if (!result) return
    const filename = `${safeFilename(result.title)}-${currentPlatform.short}.md`
    downloadTextFile(filename, storyboardToMarkdown(result, currentPlatform.name), 'text/markdown;charset=utf-8')
  }

  function exportJson() {
    if (!result) return
    const filename = `${safeFilename(result.title)}-${currentPlatform.short}.json`
    downloadTextFile(
      filename,
      JSON.stringify(
        {
          project: {
            name: projectName,
            platform,
            manualLocks: locks,
            bibleLocks,
            characters,
            products,
          },
          storyboard: result,
        },
        null,
        2,
      ),
      'application/json;charset=utf-8',
    )
  }

  function changeMode(next: WorkspaceMode) {
    setMode(next)
    setResult(null)
    setEngine(null)
    setNotice('')

    if (next === 'idea') setInput(ideaExample)
    if (next === 'script') setInput(scriptExample)
    if (next === 'reference') setInput('')
  }

  function updateLocks(value: string) {
    setLocks(value)
    if (result) {
      setResult(null)
      setEngine(null)
      setNotice('一致性锁已修改，请重新分析以确保所有镜头使用最新锁定规则。')
    }
  }

  function addLockPreset(value: string) {
    const next = locks.trim() ? `${locks.trim()}；${value}` : value
    updateLocks(next)
  }

  function updateCharacters(next: CharacterBible[]) {
    setCharacters(next)
    if (result) {
      setResult(null)
      setEngine(null)
      setNotice('Character Bible 已修改，请重新分析以应用到全部镜头。')
    }
  }

  function updateProducts(next: ProductBible[]) {
    setProducts(next)
    if (result) {
      setResult(null)
      setEngine(null)
      setNotice('Product Bible 已修改，请重新分析以应用到全部镜头。')
    }
  }

  function selectPlatform(next: PlatformId) {
    setPlatform(next)

    if (result) {
      setResult(applyGlobalLocks(recompileAnalysisResult(result, next), effectiveLocks, next))
      setNotice('已在本地切换并重新编译目标平台 Prompt，无需再次调用 AI。')
    }
  }

  async function handleReferenceFile(file?: File) {
    if (!file) return

    setPreparingReference(true)
    setReferenceProgress(file.type.startsWith('video/') ? '正在读取视频…' : '正在优化图片…')
    setNotice('')
    setResult(null)

    try {
      const prepared = await prepareReference(file, (current, total) => {
        setReferenceProgress(`正在抽取关键帧 ${current}/${total}`)
      })
      setReference(prepared)
      setReferenceProgress('')
      setMode('reference')
    } catch (error) {
      setReference(null)
      setReferenceProgress('')
      setNotice(error instanceof Error ? error.message : '参考素材处理失败。')
    } finally {
      setPreparingReference(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  function clearReference() {
    setReference(null)
    setResult(null)
    setEngine(null)
    setNotice('')
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleReferenceFile(file)
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Clapperboard size={18} /></div>
          <span>FramePilot</span>
          <span className="beta">CN · VIDEO AI</span>
        </div>
        <div className="nav-note">AI 导演 · Bible · Reverse Prompt · Timeline</div>
      </header>

      <ProjectBar
        projects={projects}
        activeProjectId={activeProjectId}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onCreate={createNewProject}
        onSave={saveCurrentProject}
        onSelect={(id) => {
          const project = projects.find((item) => item.id === id)
          if (project) applyProject(project)
        }}
        onDelete={deleteProject}
      />

      <section className="hero shell">
        <div className="eyebrow"><Sparkles size={14} /> 从想法到可执行 AI 视频项目</div>
        <h1>你负责想象，<br /><span>剩下的交给 AI 导演。</span></h1>
        <p className="hero-copy">
          描述画面、粘贴剧本，或者上传参考图与参考视频。建立 Character / Product Bible，
          系统自动拆镜、锁定一致性、生成时间轴，再编译成主流 AI 视频平台可用的 Prompt。
        </p>
      </section>

      <BiblePanel
        characters={characters}
        products={products}
        onCharactersChange={updateCharacters}
        onProductsChange={updateProducts}
      />

      <section className="workspace shell">
        <div className="composer card">
          <div className="mode-tabs mode-tabs-three">
            <button className={mode === 'idea' ? 'active' : ''} onClick={() => changeMode('idea')}>
              <WandSparkles size={16} /> 我有一个画面
            </button>
            <button className={mode === 'script' ? 'active' : ''} onClick={() => changeMode('script')}>
              <FileText size={16} /> 我有一段剧本
            </button>
            <button className={mode === 'reference' ? 'active' : ''} onClick={() => changeMode('reference')}>
              <ScanSearch size={16} /> 参考素材反推
            </button>
          </div>

          {mode !== 'reference' ? (
            <>
              <div className="field-head">
                <label>{mode === 'idea' ? '告诉导演你想看到什么' : '粘贴你的剧本 / 文案 / 分镜草稿'}</label>
                <span>{input.length} 字</span>
              </div>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="例如：一个男生在雨夜骑摩托穿过城市，镜头贴近车身低机位跟拍……"
              />

              <div className="upload-row">
                <button className="ghost" onClick={() => imageInputRef.current?.click()}>
                  <ImagePlus size={16} /> 添加参考图 <span>可直接反推</span>
                </button>
                <button className="ghost" onClick={() => videoInputRef.current?.click()}>
                  <Film size={16} /> 添加参考视频 <span>自动抽帧</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="field-head">
                <label>上传你想反推的图片或视频</label>
                <span>视频会在本地抽关键帧</span>
              </div>

              {!reference ? (
                <div
                  className={dragActive ? 'drop-zone active' : 'drop-zone'}
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  <div className="drop-icon"><Upload size={22} /></div>
                  <strong>{preparingReference ? referenceProgress : '拖入参考图 / 参考视频'}</strong>
                  <p>图片直接视觉反推；视频自动抽取 4–7 张关键帧，不上传整段视频。</p>
                  <div className="drop-actions">
                    <button onClick={() => imageInputRef.current?.click()} disabled={preparingReference}>
                      <ImagePlus size={15} /> 选择图片
                    </button>
                    <button onClick={() => videoInputRef.current?.click()} disabled={preparingReference}>
                      <Film size={15} /> 选择视频
                    </button>
                  </div>
                </div>
              ) : (
                <ReferencePreview reference={reference} onClear={clearReference} />
              )}

              <div className="field-head reference-context-title">
                <label>你希望重点反推什么？</label>
                <span>可选</span>
              </div>
              <textarea
                className="reference-context"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={referenceExample}
              />
            </>
          )}

          <input
            ref={imageInputRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handleReferenceFile(event.target.files?.[0])}
          />
          <input
            ref={videoInputRef}
            hidden
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            onChange={(event) => void handleReferenceFile(event.target.files?.[0])}
          />

          <div className="field-head platform-title">
            <label>输出到哪个平台？</label>
            <span>{result ? '切换后立即重新编译，不重新调用 AI' : '平台决定最终 Prompt 写法'}</span>
          </div>

          <div className="platform-grid">
            {platforms.map((item) => (
              <button
                key={item.id}
                onClick={() => selectPlatform(item.id)}
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

          <div className="consistency-lock">
            <div className="consistency-lock-head">
              <div>
                <span><LockKeyhole size={14} /> 一致性资产锁</span>
                <strong>补充跨镜头绝对不能变的内容</strong>
              </div>
              <small>Bible 会自动叠加</small>
            </div>
            <textarea
              value={locks}
              onChange={(event) => updateLocks(event.target.value)}
              placeholder="例如：钓箱灰色箱盖、Logo、比例和金属件结构不得改变。"
            />
            <div className="lock-presets">
              <button onClick={() => addLockPreset('人物身份、五官、发型和年龄特征全程一致')}>锁人物</button>
              <button onClick={() => addLockPreset('服装款式、颜色、配饰和穿着状态全程一致')}>锁服装</button>
              <button onClick={() => addLockPreset('产品结构、比例、颜色、Logo、接口和材质不得改变')}>锁产品</button>
              <button onClick={() => addLockPreset('场景布局、关键道具位置和人物空间关系保持连续')}>锁场景</button>
            </div>
            {bibleLocks && (
              <div className="bible-lock-preview">
                <span>自动注入的 Bible Lock</span>
                <p>{bibleLocks}</p>
              </div>
            )}
          </div>

          <button className="primary" onClick={runAnalysis} disabled={loading || preparingReference || !canRun}>
            {loading || preparingReference ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
            {preparingReference
              ? referenceProgress || '正在处理素材…'
              : loading
                ? mode === 'reference' ? 'AI 正在反推素材…' : 'AI 导演正在拆镜…'
                : mode === 'reference' ? '开始反推参考素材' : 'AI 导演分析'}
            {!loading && !preparingReference && <ArrowRight size={18} />}
          </button>

          <div className="engine-hint">
            <span className="engine-dot" />
            文本模式支持本地回退；图片 / 视频反推、单镜重生成需要视觉 / 文本 AI。项目与资产库保存在当前浏览器。
          </div>

          {notice && !result && <div className="notice composer-notice">{notice}</div>}
        </div>

        <aside className="side card">
          <div className="side-title">
            {mode === 'reference' ? <ScanSearch size={18} /> : <Layers3 size={18} />}
            {mode === 'reference' ? '反推模式会做什么？' : 'AI 导演会替你做什么？'}
          </div>

          {mode === 'reference' ? (
            <>
              <div className="step"><span>01</span><div><strong>读取视觉素材</strong><p>识别人物、产品、场景、构图、材质与明显文字。</p></div></div>
              <div className="step"><span>02</span><div><strong>视频关键帧分析</strong><p>按时间顺序比较关键帧，判断动作、节奏和场景变化。</p></div></div>
              <div className="step"><span>03</span><div><strong>反推摄影语言</strong><p>估计景别、机位、光线与可确认的运镜，不强行猜测。</p></div></div>
              <div className="step"><span>04</span><div><strong>套用 Bible</strong><p>把角色与产品锁定规则写入每个镜头，减少漂移。</p></div></div>
              <div className="step"><span>05</span><div><strong>编译目标平台 Prompt</strong><p>转换成 Seedance、Kling、Vidu 等可直接使用的语言。</p></div></div>
            </>
          ) : (
            <>
              <div className="step"><span>01</span><div><strong>理解内容</strong><p>找出人物、场景、动作、产品、对白与情绪。</p></div></div>
              <div className="step"><span>02</span><div><strong>导演拆镜</strong><p>按视觉事件和情绪转折拆镜，而不是机械按句号切。</p></div></div>
              <div className="step"><span>03</span><div><strong>读取 Bible</strong><p>角色、服装、产品与品牌规则贯穿所有镜头。</p></div></div>
              <div className="step"><span>04</span><div><strong>生成时间轴</strong><p>每镜同时产出时长、首帧、视频 Prompt 与稳定性约束。</p></div></div>
              <div className="step"><span>05</span><div><strong>局部迭代</strong><p>可拖拽排序或单独重生成某个镜头，不必重做整套方案。</p></div></div>
            </>
          )}
        </aside>
      </section>

      {result && (
        <section className="results shell" id="result">
          <div className="result-head">
            <div>
              <div className="eyebrow">
                <Check size={14} />
                {mode === 'reference' ? 'REFERENCE REVERSE COMPLETE' : 'DIRECTOR ANALYSIS COMPLETE'}
              </div>
              <h2>{result.title}</h2>
              <p>{result.summary}</p>
              <div className={engine === 'ai' ? 'engine-status ai' : 'engine-status local'}>
                <span />
                {engine === 'ai'
                  ? `AI Director · ${engineModel || 'Responses API'}`
                  : 'Local Director · 演示回退模式'}
              </div>
            </div>

            <div className="result-tools">
              <div className="meta-pills">
                <span>{result.shots.length} 镜头</span>
                <span>约 {result.totalDuration}s</span>
                <span>{result.recommendedModel}</span>
              </div>
              <div className="export-actions">
                <button onClick={copyAllPrompts}>
                  {copied === 'all' ? <Check size={14} /> : <ClipboardCopy size={14} />}
                  {copied === 'all' ? '已复制' : '复制全部'}
                </button>
                <button onClick={exportMarkdown}><Download size={14} /> 导出 MD</button>
                <button onClick={exportJson}><FileJson size={14} /> 导出 JSON</button>
              </div>
            </div>
          </div>

          {notice && <div className="notice">{notice}</div>}

          <div className="recommendation">
            <div className="recommend-icon"><Play size={18} /></div>
            <div>
              <span>当前输出模型</span>
              <strong>{currentPlatform.name} · {result.recommendedModel}</strong>
              <p>{result.reason}</p>
            </div>
          </div>

          <StoryTimeline
            result={result}
            regeneratingShotId={regeneratingShotId}
            onReorder={reorderShots}
            onRegenerate={(shot) => void regenerateShot(shot)}
          />

          <div className="shot-list">
            {result.shots.map((shot) => (
              <article className="shot-card" key={shot.id}>
                <div className="shot-index">
                  <span>SHOT {String(shot.id).padStart(2, '0')}</span>
                  <button
                    className="shot-regenerate"
                    onClick={() => void regenerateShot(shot)}
                    disabled={regeneratingShotId !== null}
                  >
                    {regeneratingShotId === shot.id ? '生成中…' : '单镜重生成'}
                  </button>
                </div>
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
                    <span>{shot.lighting}</span>
                  </div>

                  <div className="shot-brief">
                    <div><span>主体</span><p>{shot.subject}</p></div>
                    <div><span>动作</span><p>{shot.action}</p></div>
                    <div><span>连续性</span><p>{shot.continuity}</p></div>
                  </div>

                  <PromptBlock
                    title={mode === 'reference' ? '反推首帧 / 文生图 Prompt' : '首帧 / 文生图 Prompt'}
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

                  {(shot.dialogue || shot.sound) && (
                    <div className="audio-row">
                      {shot.dialogue && <span>对白：{shot.dialogue}</span>}
                      {shot.sound && <span>声音：{shot.sound}</span>}
                    </div>
                  )}

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
        <span>FramePilot V0.6</span>
        <span>Project Bible + Director + Reverse Prompt + Timeline</span>
      </footer>
    </main>
  )
}

function ReferencePreview({
  reference,
  onClear,
}: {
  reference: PreparedReference
  onClear: () => void
}) {
  return (
    <div className="reference-preview">
      <div className="reference-preview-head">
        <div>
          <span>{reference.kind === 'image' ? '参考图片' : '参考视频 · 已抽关键帧'}</span>
          <strong>{reference.name}</strong>
        </div>
        <button onClick={onClear} aria-label="移除参考素材"><X size={16} /></button>
      </div>

      <div className={reference.kind === 'image' ? 'reference-frames single' : 'reference-frames'}>
        {reference.frames.map((frame, index) => (
          <div className="reference-frame" key={index}>
            <img src={frame} alt={reference.kind === 'video' ? `关键帧 ${index + 1}` : '参考图'} />
            {reference.kind === 'video' && <span>{String(index + 1).padStart(2, '0')}</span>}
          </div>
        ))}
      </div>

      <div className="reference-meta">
        <span>{formatBytes(reference.size)}</span>
        {reference.width && reference.height && <span>{reference.width} × {reference.height}</span>}
        {reference.duration && <span>{formatDuration(reference.duration)}</span>}
        <span><Images size={12} /> {reference.frames.length} {reference.kind === 'video' ? '关键帧' : '视觉输入'}</span>
      </div>
    </div>
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
