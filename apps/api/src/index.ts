import os from 'os'
import fs from 'fs'

// ========== 启动诊断 ==========
const t0 = performance.now()
const marks: string[] = []

function mark(label: string) {
  const elapsed = Math.round(performance.now() - t0)
  marks.push(`${label}=${elapsed}ms`)
}

mark('START')
// ================================

// Step 1: Fastify
const { default: Fastify } = await import('fastify')
mark('fastify_import')

const { default: cors } = await import('@fastify/cors')
mark('cors_import')

// Step 2: 路由（这里会触发 publisher/registry → 各平台发布器）
const { transformRoutes } = await import('./routes/transform.js')
mark('route_transform')

const { platformRoutes } = await import('./routes/platforms.js')
mark('route_platforms')

// Step 3: publish 路由（最重：含 publisher registry → 所有平台发布器代码）
const { publishRoutes } = await import('./routes/publish.js')
mark('route_publish')

const { imageRoutes } = await import('./routes/images.js')
mark('route_images')

// ========== Fastify 实例化 ==========
const app = Fastify({
  logger: false,  // 关闭 logger 加速启动
  bodyLimit: 50 * 1024 * 1024,
  connectionTimeout: 10000,
  requestTimeout: 60000,
  keepAliveTimeout: 5000,
})
mark('fastify_create')

await app.register(cors, { origin: true })
mark('cors_register')

app.setErrorHandler((error, _request, reply) => {
  const msg = error instanceof Error ? error.message : String(error)
  reply.status(error.statusCode || 500).send({ error: '服务器内部错误', detail: msg })
})

app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

await app.register(transformRoutes, { prefix: '/api' })
mark('register_transform')

await app.register(platformRoutes, { prefix: '/api' })
mark('register_platforms')

await app.register(publishRoutes, { prefix: '/api' })
mark('register_publish')

await app.register(imageRoutes, { prefix: '/api' })
mark('register_images')

// ========== 监听 ==========
const port = Number(process.env.PORT) || 3000

try {
  await app.listen({ port, host: '0.0.0.0' })
  mark('listen')

  const total = Math.round(performance.now() - t0)
  marks.push(`TOTAL=${total}ms`)

  const diagPath = os.tmpdir() + '/multipost-api-startup.txt'
  try { fs.writeFileSync(diagPath, marks.join('\n') + '\n', 'utf-8') } catch {}
  console.log(`MultiPost API running at http://localhost:${port} (startup ${total}ms)`)
} catch (err) {
  try { fs.writeFileSync(os.tmpdir() + '/multipost-api-startup.txt', marks.join('\n') + '\nERROR:' + String(err) + '\n', 'utf-8') } catch {}
  console.error(err)
  process.exit(1)
}
