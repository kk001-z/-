# FramePilot 公网部署

FramePilot V0.9 已改为同域全栈部署：

```
https://your-domain.vercel.app/
  ├─ /                    Vite 前端
  └─ /api/*               Express / OpenAI Director API
```

项目根目录存在 `server.ts`。Vercel 2026 的 Node/Express 零配置后端会自动识别这个入口。

## 推荐：Vercel

1. 在 Vercel 中导入 GitHub 仓库 `kk001-z/-`
2. Framework Preset 可保持自动检测
3. Build Command 使用：
   ```
   npm run build
   ```
4. Production Environment Variables 添加：
   ```
   OPENAI_API_KEY=你的服务端 OpenAI API Key
   OPENAI_MODEL=gpt-6-luna
   ```
5. Deploy

不要创建 `VITE_OPENAI_API_KEY`，也不要把 API Key 写进 GitHub。

## 生产运行

Vercel 会构建前端，然后使用根目录：

```
server.ts
```

提供：
- 静态前端
- SPA 路由回退
- `/api/health`
- `/api/director`
- `/api/reverse`
- `/api/shot/regenerate`

本地模拟生产：

```bash
npm install
npm run build
npm start
```

访问：

```
http://localhost:3000
http://localhost:3000/api/health
```

## 分享

### 分享网站

右上角「分享网站」会调用浏览器原生 Share API；桌面环境不支持时自动复制 URL。

### 分享当前方案

结果区「分享当前方案」会把以下内容压缩到 URL hash：

- 项目名称
- 当前平台
- 输入内容
- 手动一致性锁
- Character Bible 文本
- Product Bible 文本
- Storyboard
- 所有 Prompt

参考图片不会写入分享 URL：
- 避免 URL 过长
- 避免无意暴露私有素材
- 降低分享失败率

对方打开分享链接后会进入一个“分享快照”，可以查看并继续编辑，然后另存为自己的本地项目。

## 自定义域名

部署成功后可在 Vercel Project → Domains 绑定自己的域名。

例如：

```
framepilot.ai
prompt.yourdomain.com
```
