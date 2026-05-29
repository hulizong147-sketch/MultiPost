import { FastifyInstance } from 'fastify'
import type { TransformRequest, TransformResponse, PlatformContent } from '@multipost/shared'
import { PlatformType } from '@multipost/shared'
import { normalize } from '../engine/normalizer.js'
import { adapterRegistry } from '../adapters/registry.js'

export async function transformRoutes(app: FastifyInstance) {
  app.post<{ Body: TransformRequest }>(
    '/transform',
    async (request, reply) => {
      const { markdown, platforms } = request.body

      if (!markdown || !platforms?.length) {
        return reply.status(400).send({
          error: 'markdown 和 platforms 为必填项',
        })
      }

      // Step 1: 规范化
      const normalized = normalize(markdown)

      // Step 2: 遍历选中平台，调用适配器
      const results: Record<string, PlatformContent> = {}
      for (const p of platforms) {
        try {
          const adapter = adapterRegistry.get(p as PlatformType)
          results[p] = adapter.adapt(normalized)
        } catch {
          results[p] = {
            platform: p as PlatformType,
            title: normalized.title,
            body: '',
            tags: [],
            summary: '',
            warnings: [],
          }
        }
      }

      const response: TransformResponse = { results }
      return response
    },
  )
}
