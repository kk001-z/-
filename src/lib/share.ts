import type { CreativeBrief } from './studio'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { AnalysisResult, InputMode } from './promptEngine'
import type { PlatformId } from './modelCatalog'
import type { CharacterBible, ProductBible } from './projectStore'

export interface ShareSnapshot {
  version: 1
  createdAt: number
  projectName: string
  platform: PlatformId
  input: string
  mode?: InputMode | 'reference'
  locks: string
  characters: CharacterBible[]
  products: ProductBible[]
  brief?: CreativeBrief
  result: AnalysisResult | null
}

function stripAssetBindings(snapshot: ShareSnapshot): ShareSnapshot {
  return {
    ...snapshot,
    characters: snapshot.characters.map((item) => ({
      ...item,
      referenceAssetIds: [],
    })),
    products: snapshot.products.map((item) => ({
      ...item,
      referenceAssetIds: [],
    })),
    result: snapshot.result
      ? {
          ...snapshot.result,
          versions: [],
          shots: snapshot.result.shots.map((shot) => ({
            ...shot,
            referenceAssetIds: [],
            referenceRoles: {},
          })),
        }
      : null,
  }
}

export function createShareUrl(snapshot: ShareSnapshot) {
  const safeSnapshot = stripAssetBindings(snapshot)
  const encoded = compressToEncodedURIComponent(JSON.stringify(safeSnapshot))
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = `share=${encoded}`
  return url.toString()
}

export function readShareSnapshot(): ShareSnapshot | null {
  const hash = window.location.hash
  if (!hash.startsWith('#share=')) return null

  try {
    const encoded = hash.slice('#share='.length)
    const raw = decompressFromEncodedURIComponent(encoded)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ShareSnapshot>
    if (parsed.version !== 1 || !parsed.projectName || !parsed.platform) return null
    return parsed as ShareSnapshot
  } catch {
    return null
  }
}

export async function shareUrl(title: string, url: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared' as const
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled' as const
      }
    }
  }

  await navigator.clipboard.writeText(url)
  return 'copied' as const
}

export function isLocalShareUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}
