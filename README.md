# FramePilot — 中国 AI 视频 Prompt Studio

一个面向中文 AI 视频创作者的导演型提示词工作台。

## V0.1 已实现

- 画面描述 / 剧本 两种输入模式
- 自动拆分为可生成镜头
- 自动判断景别、运镜、情绪与时长
- 每镜生成首帧 / 文生图 Prompt
- 每镜生成图生视频 Prompt
- 支持平台适配：
  - 小云雀 / Seedance
  - 即梦 / Seedance
  - 可灵 / Kling
  - LibTV
  - Vidu
  - 海螺 / MiniMax
  - 通义万相 / Wan
- 负面约束与稳定性控制
- 单镜 Prompt 一键复制
- PC / 手机响应式

## 运行

```bash
npm install
npm run dev
```

## 产品架构

当前 V0.1 使用本地规则引擎，因此无需 API Key 即可演示完整 UX。

后续建议把 `src/lib/promptEngine.ts` 拆成：

```
Director Parser
  -> Universal Shot Schema
  -> Platform Adapter
      -> Seedance
      -> Kling
      -> Vidu
      -> Hailuo
      -> Wan
      -> LibTV
```

再接入真正的 LLM，让 AI 负责剧本理解、镜头设计和 Prompt 重写；前端结构无需推翻。

## 下一阶段

1. 上传参考图 / 视频
2. 视频抽帧 + 反推镜头
3. Character Bible / Product Lock
4. 真正的 AI Director API
5. Prompt 历史记录与项目管理
6. 一键切换不同平台 Prompt
7. 分镜拖拽排序与时间轴
