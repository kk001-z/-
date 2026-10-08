import { prepareImageReference } from './media'

export interface ProjectAsset {
  id: string
  projectId: string
  name: string
  mimeType: string
  width?: number
  height?: number
  createdAt: number
  dataUrl: string
}

const DB_NAME = 'framepilot-assets'
const DB_VERSION = 1
const STORE_NAME = 'assets'

function uid() {
  return `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('projectId', 'projectId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开项目资产数据库。'))
  })
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('资产数据库操作失败。'))
  })
}

export async function createProjectAsset(file: File, projectId: string): Promise<ProjectAsset> {
  const prepared = await prepareImageReference(file)
  const asset: ProjectAsset = {
    id: uid(),
    projectId,
    name: file.name,
    mimeType: file.type || 'image/jpeg',
    width: prepared.width,
    height: prepared.height,
    createdAt: Date.now(),
    dataUrl: prepared.frames[0],
  }

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await requestResult(tx.objectStore(STORE_NAME).put(asset))
  db.close()

  return asset
}

export async function putProjectAsset(asset: ProjectAsset) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await requestResult(tx.objectStore(STORE_NAME).put(asset))
  db.close()
}

export async function listProjectAssets(projectId: string): Promise<ProjectAsset[]> {
  if (!projectId) return []

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const index = tx.objectStore(STORE_NAME).index('projectId')
  const result = await requestResult(index.getAll(projectId))
  db.close()

  return (result as ProjectAsset[]).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getProjectAssetsByIds(ids: string[]): Promise<ProjectAsset[]> {
  if (!ids.length) return []

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const assets = await Promise.all(
    ids.map(async (id) => {
      const value = await requestResult(store.get(id))
      return value as ProjectAsset | undefined
    }),
  )
  db.close()

  return assets.filter((asset): asset is ProjectAsset => Boolean(asset))
}

export async function deleteProjectAsset(id: string) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await requestResult(tx.objectStore(STORE_NAME).delete(id))
  db.close()
}

export async function deleteProjectAssets(projectId: string) {
  const assets = await listProjectAssets(projectId)
  if (!assets.length) return

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await Promise.all(assets.map((asset) => requestResult(store.delete(asset.id))))
  db.close()
}

export async function importProjectAssets(
  projectId: string,
  assets: Array<Omit<ProjectAsset, 'projectId'>>,
) {
  const restored: ProjectAsset[] = []

  for (const asset of assets) {
    if (!asset?.id || !asset.dataUrl?.startsWith('data:image/')) continue
    const next: ProjectAsset = { ...asset, projectId }
    await putProjectAsset(next)
    restored.push(next)
  }

  return restored
}
