import { FastifyInstance } from 'fastify'
import type { PlatformListResponse } from '@multipost/shared'
import { adapterRegistry } from '../adapters/registry.js'

/**
 * 平台列表路由
 *
 * GET /api/platforms — 返回所有已注册平台的元数据
 * 前端通过此接口动态获取可用平台列表，无需硬编码
 */
export async function platformRoutes(app: FastifyInstance) {
  app.get('/platforms', async () => {
    const adapters = adapterRegistry.listAll()
    const platforms = adapters.map(a => a.getMeta())

    const response: PlatformListResponse = { platforms }
    return response
  })
}
