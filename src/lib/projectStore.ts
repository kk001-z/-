import type { AnalysisResult } from './promptEngine'
import type { PlatformId } from './modelCatalog'

export interface CharacterBible {
  id: string
  name: string
  identity: string
  appearance: string
  wardrobe: string
  behavior: string
  locked: boolean
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
}

export interface FramePilotProject {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  platform: PlatformId
  input: string
  locks: string
  characters: CharacterBible[]
  products: ProductBible[]
  result: AnalysisResult | null
}

const PROJECTS_KEY = 'framepilot.projects.v0.6'
const ACTIVE_PROJECT_KEY = 'framepilot.active-project.v0.6'

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createCharacter(): CharacterBible {
  return {
    id: uid('character'),
    name: '主要人物',
    identity: '',
    appearance: '',
    wardrobe: '',
    behavior: '',
    locked: true,
  }
}

export function createProduct(): ProductBible {
  return {
    id: uid('product'),
    name: '核心产品',
    category: '',
    appearance: '',
    structure: '',
    material: '',
    branding: '',
    locked: true,
  }
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
    locks: '',
    characters: [],
    products: [],
    result: null,
  }
}

export function loadProjects(): FramePilotProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(Boolean) as FramePilotProject[]
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
      ].filter(Boolean).join('；')
      return details ? `产品「${item.name}」必须一致：${details}` : ''
    })
    .filter(Boolean)

  return [...characterLocks, ...productLocks].join('；')
}
