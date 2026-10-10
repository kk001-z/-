# FramePilot V1.1 · 跨模型导演工作台

工作流：创作简报 → 导演意图确认 → 内容 / 素材输入 → 分镜编辑 → 生成路线与执行配置 → 导出 → 结果复盘。

## 本次可运行功能

- 创作简报：用途、观众、核心信息、必须保留、总时长、画幅、自由度、优先级及可编辑导演意图。简报独立随项目保存，云端请求携带上下文，本地规则不会将简报误拆成镜头。
- 分镜编辑：镜头目的、主体、场景、起止状态、动作、景别、摄影机、光线、情绪、连续性、对白、音效和音乐。修改立即重新编译，无需云端。
- 资产范围：每镜选择出场角色 / 产品，仅注入相关资料。参考图可指定身份、产品、场景、风格、构图、首帧或尾帧用途。
- 六种路线：文生、首帧、多参考、首尾帧、动作 / 运镜参考、视频编辑 / 延长。后两种记录视频名称或地址，并导出到执行清单；需用户在目标平台上传，不在本站直接调用视频模型。
- 能力档案：收录官方来源与核验范围；明确家族级证据与具体型号 / 平台入口参数待核验的区别。未知能力不插入未核验的专用语法，不承诺所有模型支持所有路线。
- 生成前评审：区分冲突、风险、缺失；检查固定机位冲突、动作时间负荷、对白时间、首尾帧与素材用途、起止状态及相邻镜头衔接。人物静止不等于摄影机固定。评分不显示为成功率。
- 声音：后期制作时不把对白 / 音效注入视频 Prompt；选择原生音频后编译相关说明，并提示核验入口支持。
- 反推：视频关键帧附时间戳；云端结构化输出区分可见事实、推断 / 改编、无法确认，支持人工修正。抽帧未包含音轨，不能据此确认声音和完整运动。
- 执行包：导出 Markdown，包含通用意图、模型入口、模式、参数计划、每镜提示词、素材对应关系、缺失条件和声音 / 复盘说明。CSV 与项目 JSON 保留新字段；JSON 导入映射素材 ID 与用途。
- 版本：最多保存五个命名快照，比较动作、运镜、模型 / 模式与时长，恢复已有方案。图片不重复复制。分享移除素材绑定及版本历史，明确图片不包含在链接中。
- 保存：自动保留当前工作区；上传资产后刷新不会用旧项目覆盖较新的工作区。

## 验证

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm start
```

规则测试覆盖编译、作用域锁定、素材检查、声音分流、版本恢复、导入映射。浏览器测试覆盖编辑 / 保存 / 恢复、图片绑定与执行包导出、JSON 回导、静态版禁用云端操作、云端失败回退及 390px 手机布局。CI 执行同样的构建与测试。

云端视觉分析与重生成需要后端密钥；没有密钥时可完整运行本地编辑、规则拆镜、评审、保存与导出。规则结论仍需人工复核。模型资料不等于生成实测；时长、分辨率等作为计划，必须在实际入口确认。

以下保留此前版本及部署说明；V1.1 的能力边界以上文为准。

---

## V1.0：导演意图与生成前评审

- **结构化导演意图**：从实际分镜归纳主体、场景/光线、动作/叙事、摄影/情绪及连续性锁定，编辑分镜后即时更新。
- **镜头评审**：规则检测多运镜、固定/移动机位冲突、动作密度、对白时长、日夜光线冲突、缺少参考资产；逐项显示依据与修改建议。复杂度 0–100 为启发式评分，不是生成成功率；未命中不代表没有问题。
- **模型与模式独立选择**：目标视频模型和导演分析模型明确分开。文生视频、图生视频、参考图生视频会编译不同指令；镜头编辑、项目 JSON 与分享快照保留结果中的选择。
- **真实状态**：检测中、静态/后端不可达、后端在线但 AI 未配置、云端 AI 已配置。视觉反推和单镜重生成仅在 AI 已配置时开放。文本请求失败仍可本地回退，结果注明实际引擎。
- 本地导演是关键词规则引擎，不是视觉 AI；AI 已配置只表示健康检查通过，不保证上游调用成功。目标模型名称沿用已有适配标签，未实时验证版本/能力；参考图模式需确认目标平台支持。
- 本工具生成提示词，不调用视频模型；参考图与首帧仍需用户上传到目标生成平台。

验证：`npm test` 执行导演规则与模式编译回归测试；`npm run build` 检查 TypeScript 并构建前端。CI 增加相同测试，保留 API 和生产服务检查。

公开静态演示：[打开 FramePilot](https://raw.githack.com/kk001-z/-/gh-pages/index.html)。该地址随 main 的静态发布更新，CDN 可能缓存；云端 AI 需要另行部署后端及配置密钥。

# FramePilot V0.9 — 中国 AI 视频 Prompt Studio

FramePilot 是一个面向中文 AI 视频创作者的 **AI 导演 + 分镜师 + 参考素材反推 + Prompt Compiler**。

用户可以从三种入口开始：

1. 描述一个想要的画面
2. 粘贴一段剧本 / 文案 / 粗分镜
3. 上传参考图片或参考视频，反推画面和运镜

系统负责把这些输入统一编译成可执行的镜头方案，并转换成小云雀、即梦、可灵、LibTV、Vidu、海螺和 Wan 等平台可直接使用的提示词。

## 公开演示版

当前无需 Vercel / Render 账号即可访问公开演示版：

```
https://raw.githack.com/kk001-z/-/gh-pages/index.html
```

公开版由 GitHub Actions 自动构建并发布到 `gh-pages` 分支。每次 `main` 更新后会自动同步。

公开版可用：

- 画面描述 → Local Director
- 剧本 → Local Director
- Character / Product Bible
- 项目参考图本地资产库
- Storyboard Timeline
- Shot 时长修改 / 复制 / 删除 / 拖拽排序
- 多平台 Prompt 本地重新编译
- Markdown / CSV / JSON 导出
- 分享网站
- 分享当前方案链接

公开静态版暂不提供：

- 真正 AI Director
- 图片视觉反推
- 视频关键帧 AI 反推
- 单镜 AI 重生成

这些能力需要 Node/Express 后端和服务端 `OPENAI_API_KEY`。仓库已保留完整生产后端、`server.ts` 与 `render.yaml`，后续接任意 Node 托管平台即可恢复。

## V0.9 新增

- 生产网页模式
  - 根目录 `server.ts` 同时托管 Vite 前端与 Express API
  - `npm run build && npm start` 可直接模拟生产
  - 已针对 Vercel 2026 Node/Express 零配置部署结构整理
- 网页分享
  - 顶部「分享网站」
  - 支持浏览器原生 Share API
  - 不支持原生分享时自动复制链接
- 项目方案分享
  - 结果区「分享当前方案」
  - 使用 LZ 压缩把项目文本快照写入 URL hash
  - 对方打开即可恢复平台、输入、Bible 与 Storyboard
  - 分享链接不携带参考图二进制，避免隐私与超长 URL
- 分享快照打开模式
  - 不要求账号
  - 不覆盖原项目
  - 可以继续编辑并另存为自己的本地项目
- 社交分享元信息
  - Open Graph
  - Twitter Card
- 生产 CI
  - Vite Build
  - 本地 Director API Smoke Test
  - 正式生产 Web Server 首页 Smoke Test
  - 正式 `/api/health` Smoke Test

详细部署步骤见 `DEPLOY.md`。

## V0.8 新增

- 项目视觉参考图资产库
  - JPG / PNG / WEBP
  - 图片存储在浏览器 IndexedDB，而不是 LocalStorage
  - 项目切换时自动读取对应资产
- Character / Product Bible 视觉绑定
  - 同一张参考图可绑定到人物或产品 Bible
  - Bible 文本锁与视觉参考图同时参与导演分析
- AI Director 视觉锚点
  - 完整剧本 / 画面分析时可把 Bible 参考图一起发送给视觉 AI
  - 参考视频反推时明确区分“视频关键帧”和“Bible 锁定参考图”
- Shot 级参考图
  - 每个 Shot 可单独绑定最多 6 张项目参考图
  - 单镜重生成时真正把这些图片传入视觉 AI
  - 重生成后保留素材绑定
- 项目 JSON 导入 / 导出
  - 导出包含 Character Bible、Product Bible、Storyboard 和参考图数据
  - 导入时自动重建项目与 IndexedDB 参考图
  - 自动重新映射 Asset ID，避免重复导入覆盖旧项目
- CSV 分镜表导出
  - 镜头、时长、景别、运镜、主体、动作、对白、首帧 Prompt、视频 Prompt、参考素材 ID 等字段

## V0.7 新增

- 可编辑分镜：
  - 每镜直接修改时长
  - 复制 Shot
  - 删除 Shot
  - 自动重编号与重新计算总时长
- 单镜自定义重生成：
  - 输入“这一镜想怎么改”
  - 只请求该 Shot
  - 保留 Character / Product Bible 与全局锁
  - 其他镜头不重新调用 AI
- Storyboard Undo：
  - 拖拽排序
  - 时长修改
  - Shot 复制 / 删除
  - 单镜 AI 重生成
  - 都会进入撤销历史
- 时间线继续与可编辑 Shot 保持同步

## V0.6 新增

- 项目级工作区：
  - 新建项目
  - 保存项目
  - 切换项目
  - 删除项目
  - 项目保存在浏览器 LocalStorage
- Character Bible：
  - 身份
  - 外观
  - 服装
  - 表演基线
  - 可单独开启 / 关闭锁定
- Product Bible：
  - 品类
  - 外观
  - 结构
  - 材质 / 品牌元素
  - 可单独开启 / 关闭锁定
- Bible 会自动编译为全局一致性锁并注入所有镜头
- Storyboard Timeline：
  - 按镜头时长展示
  - HTML5 拖拽调整镜头顺序
  - 自动重编号
  - 自动重新计算时间轴
- 单镜 AI 重生成：
  - 只重做一个 Shot
  - 其他镜头不重新请求 AI
  - 保留项目 Bible 与一致性规则
- JSON 导出升级为完整项目包：
  - 项目名
  - 平台
  - 手动一致性锁
  - Bible Lock
  - Character Bible
  - Product Bible
  - Storyboard

## V0.5 新增

- 一致性资产锁：
  - 人物身份 / 五官 / 发型
  - 服装 / 配饰
  - 产品结构 / 比例 / Logo / 材质
  - 场景布局 / 道具位置 / 空间关系
- 全局锁定规则会强制写入每个 shot 的 continuity
- 分析完成后切换目标平台时，直接本地重新编译 Prompt，不重新调用 AI
- 一键复制全部镜头 Prompt
- 导出 Markdown 分镜文档
- 导出 JSON 结构化分镜
- 浏览器自动保存草稿、平台选择、一致性锁和最近一次生成结果

## V0.3 已实现

### 1. AI 导演

- 画面描述 → 导演方案
- 剧本 → 智能拆镜
- 不机械按句号切镜
- 根据视觉事件、动作完成度、对白反应、产品展示目的和情绪转折拆镜
- 自动判断：
  - 主体
  - 动作
  - 环境
  - 光线
  - 景别
  - 运镜
  - 情绪
  - 连续性
  - 对白
  - 声音

### 2. 参考图片反推

上传 JPG / PNG / WEBP 后：

- 浏览器端自动压缩
- 不上传原始大图
- AI 反推：
  - 主体与关键外观
  - 产品结构 / Logo / 材质
  - 场景
  - 构图
  - 景别
  - 机位
  - 光线
  - 色彩与质感
- 自动生成：
  - 反推首帧 Prompt
  - 图生视频运动 Prompt
  - 连续性锁定
  - 负面约束

### 3. 参考视频反推

视频不会整段上传。

浏览器会：

```
本地读取视频
      ↓
按时长抽取 4–7 张关键帧
      ↓
压缩关键帧
      ↓
按时间顺序发送给视觉 AI
      ↓
反推动作 / 运镜 / 节奏 / 场景变化
```

支持：

- MP4
- MOV（是否可解码取决于浏览器）
- WebM
- 其他浏览器原生支持的视频格式

默认最大本地视频：400MB。

### 4. Universal Shot Schema

所有输入最终都会转换为统一的镜头结构：

```
subject
action
environment
lighting
framing
camera
emotion
continuity
dialogue
sound
```

### 5. 多平台 Prompt Compiler

同一个镜头不会只是替换模型名字。

每个平台都有自己的输出策略：

#### 小云雀 / 即梦 / Seedance

- 时间段
- 动作变化
- 多镜头逻辑
- 中文自然语言
- 环境微运动

#### 可灵 / Kling

- 首帧优先
- Prompt 重点描述运动与演变
- 精准运镜
- 真实物理
- 产品结构锁定

#### Vidu

- 多参考锚点
- 人物 / 产品 / 场景一致性
- 避免重新设计已经锁定的主体

#### 海螺 / MiniMax

- 人物表演
- 眼神
- 微表情
- 身体重心
- 情绪递进

#### Wan

- 中文因果顺序
- 动作先后
- 空间关系
- 环境反馈

#### LibTV

作为聚合平台：

- 先生成统一高质量镜头描述
- 再按底层 Seedance / Wan / MiniMax 的能力使用

## 技术结构

```
src/
  App.tsx
  lib/
    directorApi.ts
    media.ts
    modelCatalog.ts
    promptEngine.ts

server/
  index.ts
```

整体链路：

```
画面 / 剧本 ───────────┐
                       │
参考图片 ──────────────┤
                       ├─> AI Director
参考视频 -> 本地抽帧 ──┘
                            ↓
                   Universal Shot Schema
                            ↓
                     Prompt Compiler
                            ↓
      ┌─────────┬─────────┬──────┬────────┬──────┐
   Seedance   Kling      Vidu   Hailuo   Wan   LibTV
      └─────────┴─────────┴──────┴────────┴──────┘
                            ↓
       首帧 Prompt + 视频 Prompt + 连续性约束
```

## OpenAI 视觉输入

V0.3 使用 Responses API 的图片输入能力。

参考视频本身不直接发送给模型，而是先在浏览器中抽取关键帧，再以多图片输入的方式进行时间顺序分析。

## 本地运行

### 1. 安装

```bash
npm install
```

### 2. 配置 AI

```bash
cp .env.example .env
```

然后填写：

```
OPENAI_API_KEY=你的服务端APIKey
OPENAI_MODEL=gpt-6-luna
DIRECTOR_PORT=8787
```

API Key 只允许存在于服务端。

不要放进：

- React 源码
- VITE_* 环境变量
- GitHub 仓库

### 3. 启动

```bash
npm run dev
```

启动：

- Web: http://localhost:5173
- Director API: http://localhost:8787

## 无 API Key 时

- 画面描述：可以使用 Local Director
- 剧本拆镜：可以使用 Local Director
- 图片视觉反推：需要视觉 AI
- 视频关键帧反推：需要视觉 AI

这样可以保证没有配置 API Key 时，网站基础功能依然能够打开和体验。

## 当前安全设计

- API Key 仅服务端读取
- .env 已加入 .gitignore
- 服务端只接受 1–8 张合法图片 data URL
- 请求体限制为 30MB
- 视频原文件不会发送给 AI
- 上传图片会先缩放
- 视频关键帧会先缩放和 JPEG 压缩

## CI

GitHub Actions 自动执行：

```
npm install
npm run build
Director API startup
GET /api/health
```

用于防止后续在 Codex 中修改时把前端或服务端改坏。

## 下一阶段

建议继续：

1. Shot 版本历史面板与任意版本恢复
2. 分镜表格视图
3. Character / Product 多角度参考图角色标注（正面 / 侧面 / 结构 / Logo）
4. 项目资产拖拽到 Shot
5. Shot 新增空镜 / 插入镜头
6. JSON 项目增量升级与版本迁移
7. 云端项目存储与登录
8. 模型能力配置远程更新
9. 生成成本估算
10. 直接调用视频生成 API（平台允许时）

## GitHub 参考思路

架构参考了公开项目中值得借鉴的模式，包括：

- Hao0321/ai-media-generator
- gracech0322-cmd/promptlab-image-video-to-prompt
- maciejdzierzek/kling-ai-prompt-generator
- reaink/script2video

FramePilot 使用的是独立架构，不是上述项目的简单复制。
