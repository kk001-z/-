import { CopyPlus, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Shot } from '../lib/promptEngine'
import type { ProjectAsset } from '../lib/assetStore'
import ShotReferencePicker from './ShotReferencePicker'

interface Props {
  aiReady: boolean
  blocked: boolean
  canDuplicate: boolean
  shot: Shot
  assets: ProjectAsset[]
  busy: boolean
  canDelete: boolean
  onRegenerate: (shot: Shot, instruction: string) => void
  onDuplicate: (shotId: number) => void
  onDelete: (shotId: number) => void
  onDurationChange: (shotId: number, duration: number) => void
  onAssetIdsChange: (shotId: number, ids: string[]) => void
}

export default function ShotEditTools({
  aiReady,
  blocked,
  canDuplicate,
  shot,
  assets,
  busy,
  canDelete,
  onRegenerate,
  onDuplicate,
  onDelete,
  onDurationChange,
  onAssetIdsChange,
}: Props) {
  const [instruction, setInstruction] = useState('')

  return (
    <div className="shot-edit-tools">
      <div className="shot-edit-row">
        <label>
          <span>时长</span>
          <input
            type="number"
            min={1}
            max={12}
            value={shot.duration}
            onChange={(event) => onDurationChange(shot.id, Number(event.target.value))}
          />
          <small>s</small>
        </label>

        <button onClick={() => onDuplicate(shot.id)} disabled={!canDuplicate} title={canDuplicate ? '复制这个镜头' : '已达到 20 镜头上限'}>
          <CopyPlus size={13} /> 复制
        </button>

        <button
          className="delete-shot"
          onClick={() => onDelete(shot.id)}
          disabled={!canDelete}
          title={canDelete ? '删除这个镜头' : '至少保留一个镜头'}
        >
          <Trash2 size={13} /> 删除
        </button>
      </div>

      <ShotReferencePicker
        assets={assets}
        selectedAssetIds={shot.referenceAssetIds ?? []}
        onChange={(ids) => onAssetIdsChange(shot.id, ids)}
      />

      <div className="shot-revision">
        <input
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="只改这一镜，例如：改成低机位跟拍，动作更克制，产品特写多停 1 秒"
        />
        <button
          onClick={() => onRegenerate(shot, instruction)}
          disabled={busy || blocked || !aiReady}
        >
          <RefreshCw size={13} className={busy ? 'spin' : ''} />
          {busy ? '重生成中' : aiReady ? '按要求重生成' : '云端 AI 未就绪'}
        </button>
      </div>
      {!aiReady && <p className="unavailable-reason">云端 AI 未配置，单镜重生成暂不可用。上方导演字段仍可直接编辑并重新编译。</p>}
    </div>
  )
}
