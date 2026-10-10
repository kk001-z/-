// No API key is accepted by this tool. It calls the deployed app only.
import { deflateSync } from 'node:zlib'

// A valid 64px RGB PNG; some vision providers reject tiny or malformed fixtures.
function testImage() {
  function chunk(type, data) {
    const tag = Buffer.from(type), size = Buffer.alloc(4), crc = Buffer.alloc(4)
    size.writeUInt32BE(data.length)
    let value = 0xffffffff
    for (const byte of Buffer.concat([tag, data])) {
      value ^= byte
      for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0)
    }
    crc.writeUInt32BE((value ^ 0xffffffff) >>> 0)
    return Buffer.concat([size, tag, data, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(64, 0); header.writeUInt32BE(64, 4); header[8] = 8; header[9] = 2
  const rows = Buffer.alloc(64 * 193)
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const offset = y * 193 + 1 + x * 3
    rows[offset] = 240; rows[offset + 1] = 40; rows[offset + 2] = 40
  }
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))])
  return `data:image/png;base64,${png.toString('base64')}`
}
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
    console.log('添加 --run-ai 将执行四次真实 AI 请求，产生 API 费用。')
  } else {
    const director = await request('/api/director', {input:'一个红色杯子静置在木桌上，一个镜头。',mode:'idea',platform:'kling'})
    if (director.engine !== 'ai' || !director.result?.shots?.length) throw new Error('AI 拆镜未返回有效镜头。')
    console.log('真实 AI 拆镜通过。')
    const image = testImage()
    const reverse = await request('/api/reverse', {kind:'image',images:[image],platform:'kling',context:'这是测试用的纯色色块；只描述可见事实，不虚构人物或场景。'})
    if (reverse.engine !== 'ai' || !reverse.result?.shots?.length) throw new Error('视觉反推未返回有效镜头。')
    console.log('真实图片反推接口通过（色块连通性测试，不代表反推质量）。')
    const video = await request('/api/reverse', {kind:'video',images:[image,image],timestamps:[0,1],duration:2,platform:'kling',context:'这是两张相同色块的测试关键帧，不虚构运动或声音。'})
    if (video.engine !== 'ai' || !video.result?.shots?.length || video.source?.frameCount !== 2) throw new Error('视频关键帧反推未返回有效结果。')
    console.log('真实视频关键帧反推接口通过。')
    const regenerated = await request('/api/shot/regenerate', {shot:director.result.shots[0],platform:'kling',instruction:'保持杯子静止，改为固定近景。'})
    if (regenerated.engine !== 'ai' || !regenerated.shot) throw new Error('单镜重生成未返回有效镜头。')
    console.log('真实单镜重生成通过。')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : '云端验证失败。')
  process.exitCode = 1
}
