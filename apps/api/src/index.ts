import Fastify from 'fastify'
import cors from '@fastify/cors'
import { transformRoutes } from './routes/transform.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

// 健康检查
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// 核心转换路由
await app.register(transformRoutes, { prefix: '/api' })

const port = Number(process.env.PORT) || 3000

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`MultiPost API running at http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
