import Fastify from 'fastify'
import cors from '@fastify/cors'
import { transformRoutes } from './routes/transform.js'
import { platformRoutes } from './routes/platforms.js'
import { publishRoutes } from './routes/publish.js'

const app = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024,       // 50MB
  connectionTimeout: 10000,
  requestTimeout: 60000,
  keepAliveTimeout: 5000,
})

await app.register(cors, { origin: true })

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error)
  const msg = error instanceof Error ? error.message : String(error)
  reply.status(error.statusCode || 500).send({ error: '服务器内部错误', detail: msg })
})

// 健康检查
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// 核心转换路由
await app.register(transformRoutes, { prefix: '/api' })
// 平台列表路由（前端动态发现平台）
await app.register(platformRoutes, { prefix: '/api' })
// 真实发布路由（Playwright 桥接）
await app.register(publishRoutes, { prefix: '/api' })

const port = Number(process.env.PORT) || 3000

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`MultiPost API running at http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
