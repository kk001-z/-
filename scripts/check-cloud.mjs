// No API key is accepted by this tool. It calls the deployed app only.
const [address, ...flags] = process.argv.slice(2)
if (!address || flags.some(flag => flag !== '--run-ai')) {
  console.error('用法：npm run check:cloud -- https://你的服务.onrender.com [--run-ai]')
  process.exit(1)
}
const base = new URL(address)
if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
  throw new Error('请使用不包含账号或密码的 HTTP / HTTPS 网站地址。')
}
const runAI = flags.includes('--run-ai')
async function request(path, body) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(120000),
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    const reasons = {
      401: 'API 认证失败；请在托管服务中检查密钥。',
      403: 'API 账号或模型访问权限不足。',
      429: '调用额度不足或触发限流；请检查 API 账单和限额。',
      503: '服务端 AI 尚未配置。',
    }
    const message = reasons[response.status] || (data ? `服务返回 ${data.error || response.status}；请查看服务端日志确认密钥、额度与模型权限。` : '该地址未提供 JSON API；请使用完整后端的网址。')
    throw new Error(`${path}：${message}`)
  }
  return data
}
try {
  const health = await request('/api/health')
  if (!health.ok) throw new Error('后端健康检查未通过。')
  console.log('后端健康检查通过。')
  if (!health.aiConfigured) {
    console.error('尚未配置 OPENAI_API_KEY；请在托管服务的 Environment 中填写并重新部署。')
    process.exitCode = 2
  } else if (!runAI) {
    console.log('服务端已检测到密钥；尚未验证有效性、额度或模型权限。')
    console.log('添加 --run-ai 将执行三次真实 AI 请求，产生 API 费用。')
  } else {
    const director = await request('/api/director', {input:'一个红色杯子静置在木桌上，一个镜头。',mode:'idea',platform:'kling'})
    if (director.engine !== 'ai' || !director.result?.shots?.length) throw new Error('AI 拆镜未返回有效镜头。')
    console.log('真实 AI 拆镜通过。')
    const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII='
    const reverse = await request('/api/reverse', {kind:'image',images:[image],platform:'kling',context:'这是测试用的单像素图片；只描述可见事实，不虚构人物或场景。'})
    if (reverse.engine !== 'ai' || !reverse.result?.shots?.length) throw new Error('视觉反推未返回有效镜头。')
    console.log('真实视觉反推接口通过（单像素连通性测试，不代表反推质量）。')
    const regenerated = await request('/api/shot/regenerate', {shot:director.result.shots[0],platform:'kling',instruction:'保持杯子静止，改为固定近景。'})
    if (regenerated.engine !== 'ai' || !regenerated.shot) throw new Error('单镜重生成未返回有效镜头。')
    console.log('真实单镜重生成通过。')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : '云端验证失败。')
  process.exitCode = 1
}
