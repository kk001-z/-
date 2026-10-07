# FramePilot — 中国 AI 视频 Prompt Studio

FramePilot 是一个面向中文 AI 视频创作者的“AI 导演 + 分镜师 + Prompt Compiler”。

用户只需要：
- 描述一个想要的画面，或
- 粘贴一段剧本 / 文案 / 粗分镜

系统负责：
1. 理解人物、产品、动作、环境、对白和情绪
2. 按视觉事件与情绪转折设计镜头
3. 建立统一的 Universal Shot Schema
4. 生成每镜首帧 / 文生图 Prompt
5. 编译成目标平台偏好的图生视频 Prompt
6. 保留人物、服装、产品结构、Logo、位置和视线连续性

## V0.2 已实现

- 画面描述 / 剧本 两种输入模式
- 真正的 AI Director 服务端接口
- 未配置 AI 时自动回退到本地规则引擎
- AI 拆镜不再机械按句号切分
- Universal Shot Schema：
  - subject
  - action
  - environment
  - lighting
  - framing
  - camera
  - emotion
  - continuity
  - dialogue
  - sound
- 每镜生成首帧 Prompt
- 每镜生成图生视频 Prompt
- 平台 Prompt Adapter：
  - 小云雀 / Seedance
  - 即梦 / Seedance
  - 可灵 / Kling
  - LibTV
  - Vidu
  - 海螺 / MiniMax
  - 通义万相 / Wan
- 产品结构 / Logo / 身份 / 服装 / 空间连续性约束
- 单镜 Prompt 一键复制
- AI / Local 引擎状态显示
- PC / 手机响应式

## 项目结构

```
src/
  App.tsx
  lib/
    directorApi.ts      # 前端调用 AI Director；失败自动 fallback
    modelCatalog.ts     # 中国主流平台 / 模型配置
    promptEngine.ts     # Universal Shot Schema + Platform Adapter + Local Director

server/
  index.ts              # 服务端 AI Director / Responses API
```

核心架构：

```
用户自然语言 / 剧本
        ↓
AI Director
        ↓
Universal Shot Schema
        ↓
Prompt Compiler
        ↓
┌────────────┬───────────┬────────┬────────┬────────┐
Seedance    Kling       Vidu     Hailuo    Wan     LibTV
└────────────┴───────────┴────────┴────────┴────────┘
        ↓
首帧 Prompt + 图生视频 Prompt + 稳定性约束
```

## 本地运行

### 1. 安装

```bash
npm install
```

### 2. 可选：启用真正的 AI Director

复制：

```bash
cp .env.example .env
```

然后只在服务端的 `.env` 中填写 API Key。

不要把密钥写进：
- React 代码
- `VITE_*` 环境变量
- GitHub 仓库

默认 AI 模型可以通过：

```
OPENAI_MODEL=gpt-6-luna
```

覆盖。

### 3. 启动

```bash
npm run dev
```

会同时启动：
- Vite: http://localhost:5173
- Director API: http://localhost:8787

如果没有配置服务端 AI Key，页面仍然可以正常工作，会自动切换成 Local Director。

## Prompt Adapter 思路

不同平台不会只是“替换模型名字”。

### Seedance / 小云雀 / 即梦
强调：
- 时间段
- 动作过程
- 多镜头逻辑
- 中文自然语言
- 环境真实运动

### Kling / 可灵
强调：
- 首帧已经定义外观
- Prompt 主要描述运动与演变
- 运镜精度
- 真实物理
- 产品结构锁定

### Vidu
强调：
- 多参考锚点
- 人物 / 产品 / 场景一致性
- 不重新设计已锁定外观

### 海螺 / MiniMax
强调：
- 人物表演
- 眼神
- 微表情
- 身体重心
- 情绪递进

### Wan
强调：
- 中文因果顺序
- 动作先后
- 空间关系
- 环境反馈

### LibTV
作为聚合平台：
- 先生成通用高质量镜头描述
- 再根据实际底层模型适配 Seedance / Wan / MiniMax

## V0.3 规划

下一阶段优先做：

1. 上传参考图片
2. 图片反推主体 / 构图 / 光线 / 风格
3. 上传参考视频
4. 视频自动抽关键帧
5. 反推：
   - 运镜
   - 人物动作
   - 节奏
   - 转场
   - 景别变化
6. Character Bible
7. Product Lock
8. 同一镜头一键切换不同平台 Prompt
9. 分镜拖拽排序
10. 项目历史 / Prompt 版本管理

## 参考思路

项目架构参考了公开 GitHub 项目中值得借鉴的思路，包括：

- Hao0321/ai-media-generator — 多平台 Prompt Engine / model rules
- gracech0322-cmd/promptlab-image-video-to-prompt — 图片 / 视频反推
- maciejdzierzek/kling-ai-prompt-generator — Kling I2V / Motion Prompt 规则
- reaink/script2video — Script → Shot → Prompt 工作流

FramePilot 并不直接复制它们的产品，而是把这些思路组合成更适合中国 AI 视频工具工作流的独立架构。
