import { FastifyInstance } from 'fastify'
import { createHash } from 'crypto'
import type { TransformRequest, TransformResponse, PlatformContent } from '@multipost/shared'
import { PlatformType } from '@multipost/shared'
import { normalize } from '../engine/normalizer.js'
import { adapterRegistry } from '../adapters/registry.js'

const cache = new Map<string, { data: TransformResponse; time: number }>()
const CACHE_TTL = 3000
const CACHE_MAX = 50

function hash(md: string, plats: string[]): string {
  return createHash('md5').update(md + plats.sort().join(',')).digest('hex')
}

export async function transformRoutes(app: FastifyInstance) {
  app.post<{ Body: TransformRequest }>(
    '/transform',
    async (request, reply) => {
      try {
        const { markdown, platforms } = request.body

        if (!markdown || !platforms?.length) {
          return reply.status(400).send({ error: 'markdown 和 platforms 为必填项' })
        }

        const key = hash(markdown, platforms)
        const cached = cache.get(key)
        if (cached && Date.now() - cached.time < CACHE_TTL) {
          return cached.data
        }

        const normalized = normalize(markdown)
        const results: Record<string, PlatformContent> = {}
        for (const p of platforms) {
          try {
            const adapter = adapterRegistry.get(p as PlatformType)
            results[p] = adapter.adapt(normalized)
          } catch {
            results[p] = { platform: p as PlatformType, title: normalized.title, body: '', tags: [], summary: '', warnings: ['适配器处理异常'] }
          }
        }

        const response: TransformResponse = { results }
        if (cache.size >= CACHE_MAX) { cache.clear() }
        cache.set(key, { data: response, time: Date.now() })
        return response
      } catch (err: any) {
        return reply.status(500).send({ error: '服务器内部错误', detail: err.message })
      }
    },
  )
}
