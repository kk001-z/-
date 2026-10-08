import { FolderOpen, Plus, Save, Trash2 } from 'lucide-react'
import type { FramePilotProject } from '../lib/projectStore'

interface Props {
  projects: FramePilotProject[]
  activeProjectId: string
  projectName: string
  onProjectNameChange: (value: string) => void
  onCreate: () => void
  onSave: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export default function ProjectBar({
  projects,
  activeProjectId,
  projectName,
  onProjectNameChange,
  onCreate,
  onSave,
  onSelect,
  onDelete,
}: Props) {
  return (
    <section className="project-bar shell">
      <div className="project-bar-left">
        <div className="project-icon"><FolderOpen size={16} /></div>
        <div>
          <span>当前项目</span>
          <input
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="未命名项目"
          />
        </div>
      </div>

      <div className="project-bar-right">
        {projects.length > 0 && (
          <select
            value={activeProjectId}
            onChange={(event) => onSelect(event.target.value)}
            aria-label="切换项目"
          >
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}

        <button onClick={onSave}><Save size={14} /> 保存项目</button>
        <button onClick={onCreate}><Plus size={14} /> 新建</button>
        {activeProjectId && (
          <button
            className="danger-lite"
            onClick={() => onDelete(activeProjectId)}
            title="删除当前项目"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </section>
  )
}
