export const workspaceSections = [
  { id: 'brief', label: '创作简报' },
  { id: 'composer', label: '内容输入' },
  { id: 'assets', label: '项目素材' },
  { id: 'result', label: '导演分镜' },
  { id: 'execution', label: '生成执行' },
  { id: 'versions', label: '版本复盘' },
] as const
export type WorkspaceSection = typeof workspaceSections[number]['id']
export function isWorkspaceSection(id: string): id is WorkspaceSection {
  return workspaceSections.some(section => section.id === id)
}
export function revealWorkspaceSection(id: WorkspaceSection, updateUrl = true) {
  const target = document.getElementById(id)
  if (!target) return false
  let element: HTMLElement | null = target
  while (element) {
    if (element instanceof HTMLDetailsElement) element.open = true
    element = element.parentElement
  }
  if (updateUrl && window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`)
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
  target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  return true
}
