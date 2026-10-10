import { GripVertical, RefreshCw, TimerReset } from 'lucide-react'
import type { AnalysisResult, Shot } from '../lib/promptEngine'

interface Props {
  aiReady: boolean
  result: AnalysisResult
  regeneratingShotId: number | null
  onReorder: (fromIndex: number, toIndex: number) => void
  onRegenerate: (shot: Shot) => void
}

export default function StoryTimeline({
  aiReady,
  result,
  regeneratingShotId,
  onReorder,
  onRegenerate,
}: Props) {
  const total = Math.max(1, result.totalDuration)

  return (
    <section className="timeline-panel">
      <div className="timeline-head">
        <div>
          <span><TimerReset size={13} /> STORYBOARD TIMELINE</span>
          <strong>{result.shots.length} 镜头 · 约 {result.totalDuration}s</strong>
        </div>
        <small>拖动镜头卡可以调整顺序</small>
      </div>

      <div className="timeline-track">
        {result.shots.map((shot, index) => (
          <article
            key={shot.id}
            className="timeline-shot"
            draggable
            style={{ flexGrow: Math.max(shot.duration / total * 100, 8) }}
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', String(index))
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const from = Number(event.dataTransfer.getData('text/plain'))
              if (Number.isFinite(from)) onReorder(from, index)
            }}
          >
            <div className="timeline-shot-top">
              <span><GripVertical size={11} /> S{String(shot.id).padStart(2, '0')}</span>
              <small>{shot.duration}s</small>
            </div>
            <strong>{shot.title}</strong>
            <button
              onClick={() => onRegenerate(shot)}
              disabled={!aiReady || regeneratingShotId !== null}
              title="单镜重新生成"
            >
              <RefreshCw size={11} className={regeneratingShotId === shot.id ? 'spin' : ''} />
              {regeneratingShotId === shot.id ? '生成中' : aiReady ? '重生成' : '需云端 AI'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
