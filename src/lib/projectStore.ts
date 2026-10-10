import { normalizeBrief, type CreativeBrief } from './studio'
import type { AnalysisResult, InputMode } from './promptEngine'
import type { PlatformId } from './modelCatalog'

export interface CharacterBible {
  id: string
  name: string
  identity: string
  appearance: string
  wardrobe: string
  behavior: string
  locked: boolean
  referenceAssetIds: string[]
}

export interface ProductBible {
  id: string
  name: string
  category: string
  appearance: string
  structure: string
  material: string
  branding: string
  locked: boolean
  referenceAssetIds: string[]
}

export interface FramePilotProject {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  platform: PlatformId
  input: string
  mode?: InputMode | 'reference'
  locks: string
  characters: CharacterBible[]
  products: ProductBible[]
  brief?: CreativeBrief
  result: AnalysisResult | null
}

const PROJECTS_KEY = 'framepilot.projects.v0.6'
const ACTIVE_PROJECT_KEY = 'framepilot.active-project.v0.6'

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeCharacter(item: Partial<CharacterBible>): CharacterBible {
  return {
    id: item.id || uid('character'),
    name: item.name || '主要人物',
    identity: item.identity || '',
    appearance: item.appearance || '',
    wardrobe: item.wardrobe || '',
    behavior: item.behavior || '',
    locked: item.locked !== false,
    referenceAssetIds: Array.isArray(item.referenceAssetIds) ? item.referenceAssetIds : [],
  }
}

function normalizeProduct(item: Partial<ProductBible>): ProductBible {
  return {
    id: item.id || uid('product'),
    name: item.name || '核心产品',
    category: item.category || '',
    appearance: item.appearance || '',
    structure: item.structure || '',
    material: item.material || '',
    branding: item.branding || '',
    locked: item.locked !== false,
    referenceAssetIds: Array.isArray(item.referenceAssetIds) ? item.referenceAssetIds : [],
  }
}

export function createCharacter(): CharacterBible {
  return normalizeCharacter({})
}

export function createProduct(): ProductBible {
  return normalizeProduct({})
}

export function createProject(name = '未命名项目'): FramePilotProject {
  const now = Date.now()
  return {
    id: uid('project'),
    name,
    createdAt: now,
    updatedAt: now,
    platform: 'xiaoyunque',
    input: '',
    mode: 'idea',
    locks: '',
    characters: [],
    products: [],
    result: null,
  }
}

export function normalizeProject(project: Partial<FramePilotProject>): FramePilotProject {
  const now = Date.now()
  return {
    id: project.id || uid('project'),
    name: project.name || '未命名项目',
    createdAt: Number(project.createdAt) || now,
    updatedAt: Number(project.updatedAt) || now,
    platform: project.platform || 'xiaoyunque',
    input: project.input || '',
    mode: project.mode === 'script' || project.mode === 'reference' ? project.mode : 'idea',
    locks: project.locks || '',
    brief: normalizeBrief(project.brief || project.result?.brief),
    characters: Array.isArray(project.characters)
      ? project.characters.map((item) => normalizeCharacter(item))
      : [],
    products: Array.isArray(project.products)
      ? project.products.map((item) => normalizeProduct(item))
      : [],
    result: project.result && typeof project.result === 'object'
      ? project.result as AnalysisResult
      : null,
  }
}

export function loadProjects(): FramePilotProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(Boolean).map((item) => normalizeProject(item))
  } catch {
    return []
  }
}

export function saveProjects(projects: FramePilotProject[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

export function loadActiveProjectId() {
  return localStorage.getItem(ACTIVE_PROJECT_KEY) || ''
}

export function saveActiveProjectId(id: string) {
  if (id) localStorage.setItem(ACTIVE_PROJECT_KEY, id)
  else localStorage.removeItem(ACTIVE_PROJECT_KEY)
}

export function buildBibleLocks(
  characters: CharacterBible[],
  products: ProductBible[],
) {
  const characterLocks = characters
    .filter((item) => item.locked)
    .map((item) => {
      const details = [
        item.identity && `身份：${item.identity}`,
        item.appearance && `外观：${item.appearance}`,
        item.wardrobe && `服装：${item.wardrobe}`,
        item.behavior && `表演：${item.behavior}`,
        item.referenceAssetIds.length
          ? `绑定 ${item.referenceAssetIds.length} 张人物参考图`
          : '',
      ].filter(Boolean).join('；')
      return details ? `人物「${item.name}」必须一致：${details}` : ''
    })
    .filter(Boolean)

  const productLocks = products
    .filter((item) => item.locked)
    .map((item) => {
      const details = [
        item.category && `品类：${item.category}`,
        item.appearance && `外观：${item.appearance}`,
        item.structure && `结构：${item.structure}`,
        item.material && `材质：${item.material}`,
        item.branding && `品牌元素：${item.branding}`,
        item.referenceAssetIds.length
          ? `绑定 ${item.referenceAssetIds.length} 张产品参考图`
          : '',
      ].filter(Boolean).join('；')
      return details ? `产品「${item.name}」必须一致：${details}` : ''
    })
    .filter(Boolean)

  return [...characterLocks, ...productLocks].join('；')
}
