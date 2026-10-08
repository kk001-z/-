# FramePilot V0.7 — 中国 AI 视频 Prompt Studio

FramePilot 是一个面向中文 AI 视频创作者的 **AI 导演 + 分镜师 + 参考素材反推 + Prompt Compiler**。

用户可以从三种入口开始：

1. 描述一个想要的画面
2. 粘贴一段剧本 / 文案 / 粗分镜
3. 上传参考图片或参考视频，反推画面和运镜

系统负责把这些输入统一编译成可执行的镜头方案，并转换成小云雀、即梦、可灵、LibTV、Vidu、海螺和 Wan 等平台可直接使用的提示词。

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

1. Prompt / Shot 版本历史
2. 单镜手动修改指令后重生成
3. 项目资产参考图绑定到 Character / Product Bible
4. 分镜表格视图与 CSV 导出
5. 镜头时长直接编辑
6. Shot 删除 / 复制 / 新增
7. 项目导入 JSON
8. 云端项目存储与登录
9. 真实模型能力自动更新
10. 直接调用视频生成 API（平台允许时）

## GitHub 参考思路

架构参考了公开项目中值得借鉴的模式，包括：

- Hao0321/ai-media-generator
- gracech0322-cmd/promptlab-image-video-to-prompt
- maciejdzierzek/kling-ai-prompt-generator
- reaink/script2video

FramePilot 使用的是独立架构，不是上述项目的简单复制。
