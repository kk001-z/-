import {
  BadgePlus,
  Boxes,
  LockKeyhole,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  createCharacter,
  createProduct,
  type CharacterBible,
  type ProductBible,
} from '../lib/projectStore'

interface Props {
  characters: CharacterBible[]
  products: ProductBible[]
  onCharactersChange: (items: CharacterBible[]) => void
  onProductsChange: (items: ProductBible[]) => void
}

export default function BiblePanel({
  characters,
  products,
  onCharactersChange,
  onProductsChange,
}: Props) {
  function updateCharacter(id: string, patch: Partial<CharacterBible>) {
    onCharactersChange(
      characters.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  function updateProduct(id: string, patch: Partial<ProductBible>) {
    onProductsChange(
      products.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  return (
    <section className="bible-panel card">
      <div className="bible-head">
        <div>
          <span className="bible-kicker"><Boxes size={13} /> PROJECT ASSETS</span>
          <h3>角色与产品资产库</h3>
          <p>这些资料会自动转成跨镜头一致性规则，并跟随当前项目保存。</p>
        </div>
        <div className="bible-actions">
          <button onClick={() => onCharactersChange([...characters, createCharacter()])}>
            <UserRound size={14} /> 新建角色
          </button>
          <button onClick={() => onProductsChange([...products, createProduct()])}>
            <BadgePlus size={14} /> 新建产品
          </button>
        </div>
      </div>

      {!characters.length && !products.length && (
        <div className="bible-empty">
          <Plus size={18} />
          <strong>这个项目还没有固定资产</strong>
          <span>有固定人物或产品时再添加；纯风景镜头可以留空。</span>
        </div>
      )}

      <div className="bible-grid">
        {characters.map((character) => (
          <article className="bible-card" key={character.id}>
            <div className="bible-card-top">
              <span><UserRound size={13} /> Character Bible</span>
              <div className="bible-card-controls">
                <label className={character.locked ? 'mini-lock active' : 'mini-lock'}>
                  <LockKeyhole size={12} />
                  <input
                    type="checkbox"
                    checked={character.locked}
                    onChange={(event) => updateCharacter(character.id, { locked: event.target.checked })}
                  />
                  {character.locked ? '已锁定' : '未锁定'}
                </label>
                <button
                  className="icon-button"
                  aria-label="删除角色"
                  onClick={() => onCharactersChange(characters.filter((item) => item.id !== character.id))}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <input
              className="bible-name"
              value={character.name}
              onChange={(event) => updateCharacter(character.id, { name: event.target.value })}
              placeholder="角色名"
            />

            <div className="bible-fields">
              <label>
                <span>身份</span>
                <textarea
                  value={character.identity}
                  onChange={(event) => updateCharacter(character.id, { identity: event.target.value })}
                  placeholder="例如：25 岁亚洲男性，钓鱼爱好者"
                />
              </label>
              <label>
                <span>外观</span>
                <textarea
                  value={character.appearance}
                  onChange={(event) => updateCharacter(character.id, { appearance: event.target.value })}
                  placeholder="五官、发型、体型、明显识别特征"
                />
              </label>
              <label>
                <span>服装</span>
                <textarea
                  value={character.wardrobe}
                  onChange={(event) => updateCharacter(character.id, { wardrobe: event.target.value })}
                  placeholder="款式、颜色、鞋子、配饰"
                />
              </label>
              <label>
                <span>表演基线</span>
                <textarea
                  value={character.behavior}
                  onChange={(event) => updateCharacter(character.id, { behavior: event.target.value })}
                  placeholder="例如：自然克制，不夸张表演"
                />
              </label>
            </div>
          </article>
        ))}

        {products.map((product) => (
          <article className="bible-card product-bible" key={product.id}>
            <div className="bible-card-top">
              <span><Boxes size={13} /> Product Bible</span>
              <div className="bible-card-controls">
                <label className={product.locked ? 'mini-lock active' : 'mini-lock'}>
                  <LockKeyhole size={12} />
                  <input
                    type="checkbox"
                    checked={product.locked}
                    onChange={(event) => updateProduct(product.id, { locked: event.target.checked })}
                  />
                  {product.locked ? '已锁定' : '未锁定'}
                </label>
                <button
                  className="icon-button"
                  aria-label="删除产品"
                  onClick={() => onProductsChange(products.filter((item) => item.id !== product.id))}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <input
              className="bible-name"
              value={product.name}
              onChange={(event) => updateProduct(product.id, { name: event.target.value })}
              placeholder="产品名"
            />

            <div className="bible-fields">
              <label>
                <span>品类</span>
                <textarea
                  value={product.category}
                  onChange={(event) => updateProduct(product.id, { category: event.target.value })}
                  placeholder="例如：靠背钓箱 / 耳机 / 饮料"
                />
              </label>
              <label>
                <span>外观</span>
                <textarea
                  value={product.appearance}
                  onChange={(event) => updateProduct(product.id, { appearance: event.target.value })}
                  placeholder="颜色、比例、轮廓、关键视觉特征"
                />
              </label>
              <label>
                <span>结构</span>
                <textarea
                  value={product.structure}
                  onChange={(event) => updateProduct(product.id, { structure: event.target.value })}
                  placeholder="不能改变的零件、接口、机构关系"
                />
              </label>
              <label>
                <span>材质 / 品牌</span>
                <textarea
                  value={[product.material, product.branding].filter(Boolean).join('；')}
                  onChange={(event) => {
                    const value = event.target.value
                    updateProduct(product.id, { material: value, branding: '' })
                  }}
                  placeholder="材质、Logo、文字、品牌识别元素"
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
