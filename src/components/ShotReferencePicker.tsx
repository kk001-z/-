import { Image, Link2 } from 'lucide-react'
import type { ProjectAsset } from '../lib/assetStore'

interface Props {
  assets: ProjectAsset[]
  selectedAssetIds: string[]
  onChange: (ids: string[]) => void
}

export default function ShotReferencePicker({
  assets,
  selectedAssetIds,
  onChange,
}: Props) {
  if (!assets.length) return null

  function toggle(id: string) {
    const next = selectedAssetIds.includes(id)
      ? selectedAssetIds.filter((item) => item !== id)
      : [...selectedAssetIds, id]
    onChange(next.slice(0, 6))
  }

  return (
    <div className="shot-reference-picker">
      <div className="shot-reference-title">
        <span><Image size={11} /> 本镜参考图</span>
        <small>最多 6 张 · 重生成时会真正发送给视觉 AI</small>
      </div>

      <div className="shot-reference-grid">
        {assets.map((asset) => {
          const active = selectedAssetIds.includes(asset.id)
          return (
            <button
              type="button"
              key={asset.id}
              className={active ? 'shot-reference active' : 'shot-reference'}
              onClick={() => toggle(asset.id)}
              title={asset.name}
            >
              <img src={asset.dataUrl} alt={asset.name} />
              {active && <span><Link2 size={9} /> 已绑定</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
