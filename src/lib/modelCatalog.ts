export type PlatformId =
  | 'xiaoyunque'
  | 'jimeng'
  | 'kling'
  | 'libtv'
  | 'vidu'
  | 'hailuo'
  | 'wan'

export interface Platform {
  id: PlatformId
  name: string
  short: string
  models: string[]
  specialty: string
}

export const platforms: Platform[] = [
  {
    id: 'xiaoyunque',
    name: '小云雀',
    short: '小云雀',
    models: ['Seedance 2.5', 'Seedance 2.0'],
    specialty: '中文剧本、多镜头叙事、营销内容',
  },
  {
    id: 'jimeng',
    name: '即梦',
    short: '即梦',
    models: ['Seedance 2.5', 'Seedance 2.0'],
    specialty: '中文理解、多镜头、图生视频',
  },
  {
    id: 'kling',
    name: '可灵 AI',
    short: '可灵',
    models: ['Kling 3.0', 'Kling O-Series'],
    specialty: '精准动作、运镜、产品结构保持',
  },
  {
    id: 'libtv',
    name: 'LibTV',
    short: 'LibTV',
    models: ['Seedance 2.5', 'Wan', 'MiniMax'],
    specialty: '聚合模型、快速试片、多方案对比',
  },
  {
    id: 'vidu',
    name: 'Vidu',
    short: 'Vidu',
    models: ['Vidu Q3'],
    specialty: '多参考图、角色一致性、动漫',
  },
  {
    id: 'hailuo',
    name: '海螺 AI',
    short: '海螺',
    models: ['Hailuo / MiniMax'],
    specialty: '人物表演、微表情、情绪变化',
  },
  {
    id: 'wan',
    name: '通义万相',
    short: '万相',
    models: ['Wan'],
    specialty: '中文画面理解、复杂场景、通用视频',
  },
]

export const defaultPlatform: PlatformId = 'xiaoyunque'
