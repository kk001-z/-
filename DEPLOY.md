# FramePilot 公网部署

## V1.1 云端 AI 开通（推荐 Render 同域部署）

[一键部署 FramePilot 到 Render](https://render.com/deploy?repo=https://github.com/kk001-z/-)

1. 在 [OpenAI API 控制台](https://platform.openai.com/api-keys) 创建自己的项目密钥，并确认 API 账号具备可用额度及模型权限。本站不会创建或赠送 API 调用额度。
2. 打开上面的部署入口，登录 Render 并连接 `kk001-z/-` 仓库。仓库中的 `render.yaml` 已设置安装、构建、启动和健康检查。
3. 在 Render 的私密环境变量中填写 `OPENAI_API_KEY`。`OPENAI_MODEL` 默认 `gpt-6-luna`，支持图像输入和结构化输出；如果账号没有权限，改用账号已开通且支持这两种能力的模型。
4. 完成部署后使用 Render 返回的 HTTPS 地址。前端与 `/api/*` 后端位于同一域名，无需修改前端请求地址。
5. 先检查健康状态，再测试真实 AI。不要把密钥粘贴到聊天、前端输入框、GitHub 或 `VITE_*` 变量中。

```bash
# 不产生 AI 调用费用；只检查后端和密钥是否存在
npm run check:cloud -- https://你的服务.onrender.com
# 三次真实 AI 请求，会消耗 API 额度：拆镜、图像反推、单镜重生成
npm run check:cloud -- https://你的服务.onrender.com --run-ai
```

健康接口的 `aiConfigured: true` 只表示密钥已填写，不能证明密钥有效、有余额或模型可用。只有真实请求通过才能确认云端 AI 已开通。视频反推使用抽出的关键帧，不会把视频文件直接上传给模型。

原来的 raw.githack 静态地址不会因为 Render 配置了密钥自动启用 AI；完整功能请分享新的 Render 地址。项目仍存储于浏览器中，切换域名前请先导出项目 JSON，再在新网站导入。

Render 免费服务可能休眠，首次打开和唤醒时需要等待；API 调用按服务商账单计费。公开网站的访客调用会消耗你的 API 额度，上线前请设置适合自己的额度和访问策略。

官方说明：[Render 部署入口](https://render.com/docs/deploy-to-render)、[Render 私密环境变量](https://render.com/docs/configure-environment-variables)、[OpenAI 密钥认证](https://developers.openai.com/api/reference/overview)、[默认模型能力](https://developers.openai.com/api/docs/models/gpt-6-luna)。

## 其他部署方式（此前说明）

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
