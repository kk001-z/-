import { ImagePlus, Link2, Trash2, Unlink } from 'lucide-react'
import type { ProjectAsset } from '../lib/assetStore'
import type { CharacterBible, ProductBible } from '../lib/projectStore'

interface Props {
  assets: ProjectAsset[]
  characters: CharacterBible[]
  products: ProductBible[]
  busy: boolean
  onUpload: (file: File) => void
  onDelete: (assetId: string) => void
  onBind: (assetId: string, target: string) => void
  onUnbind: (assetId: string, target: string) => void
}

function boundTargets(
  assetId: string,
  characters: CharacterBible[],
  products: ProductBible[],
) {
  return [
    ...characters
      .filter((item) => item.referenceAssetIds.includes(assetId))
      .map((item) => ({ key: `character:${item.id}`, label: `人物 · ${item.name}` })),
    ...products
      .filter((item) => item.referenceAssetIds.includes(assetId))
      .map((item) => ({ key: `product:${item.id}`, label: `产品 · ${item.name}` })),
  ]
}

export default function AssetLibrary({
  assets,
  characters,
  products,
  busy,
  onUpload,
  onDelete,
  onBind,
  onUnbind,
}: Props) {
  return (
    <section className="asset-library card">
      <div className="asset-library-head">
        <div>
          <span><ImagePlus size={13} /> VISUAL REFERENCES</span>
          <h3>项目参考图资产库</h3>
          <p>图片保存在浏览器 IndexedDB；可绑定到 Character / Product Bible，也可在具体 Shot 中选择。</p>
        </div>
        <label className="asset-upload">
          <ImagePlus size={14} />
          {busy ? '处理中…' : '添加参考图'}
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onUpload(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      {!assets.length ? (
        <div className="asset-library-empty">
          暂无项目参考图。人物正脸/侧脸、产品标准角度、Logo 与结构特写都适合放进这里。
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map((asset) => {
            const bindings = boundTargets(asset.id, characters, products)

            return (
              <article className="asset-card" key={asset.id}>
                <div className="asset-thumb">
                  <img src={asset.dataUrl} alt={asset.name} />
                </div>

                <div className="asset-card-body">
                  <strong title={asset.name}>{asset.name}</strong>
                  <span>{asset.width && asset.height ? `${asset.width}×${asset.height}` : 'Reference image'}</span>

                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) onBind(asset.id, event.target.value)
                      event.currentTarget.value = ''
                    }}
                  >
                    <option value="">绑定到 Bible…</option>
                    {characters.map((item) => (
                      <option value={`character:${item.id}`} key={`character:${item.id}`}>
                        人物 · {item.name}
                      </option>
                    ))}
                    {products.map((item) => (
                      <option value={`product:${item.id}`} key={`product:${item.id}`}>
                        产品 · {item.name}
                      </option>
                    ))}
                  </select>

                  <div className="asset-bindings">
                    {bindings.length ? bindings.map((binding) => (
                      <button
                        key={binding.key}
                        onClick={() => onUnbind(asset.id, binding.key)}
                        title="点击解除绑定"
                      >
                        <Link2 size={10} />
                        {binding.label}
                        <Unlink size={9} />
                      </button>
                    )) : <small>尚未绑定 Bible</small>}
                  </div>
                </div>

                <button
                  className="asset-delete"
                  onClick={() => onDelete(asset.id)}
                  aria-label="删除参考图"
                >
                  <Trash2 size={13} />
                </button>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
