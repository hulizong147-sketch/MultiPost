import { FastifyInstance } from 'fastify'
import type { PlatformContent, PlatformType } from '@multipost/shared'
import { adapterRegistry } from '../adapters/registry.js'
import { publisherRegistry } from '../publishers/registry.js'
import { normalize } from '../engine/normalizer.js'
import type { PublishResult } from '../publishers/base.js'

interface PublishRequest {
  platform: PlatformType
  markdown: string    // 原始 Markdown（后端重新转换确保格式正确）
  title?: string      // 可选覆盖标题
  tags?: string[]     // 可选覆盖标签
}

interface PublishResponse {
  result: PublishResult
}

/**
 * 真实发布路由
 *
 * POST /api/publish
 * Body: { platform, markdown, title?, tags? }
 *
 * 流程：Markdown → normalize → adapter.adapt → publisher.publish
 */
export async function publishRoutes(app: FastifyInstance) {
  app.post<{ Body: PublishRequest }>('/publish', async (request, reply) => {
    const { platform, markdown, title: overrideTitle, tags: overrideTags } = request.body

    if (!platform || !markdown) {
      return reply.status(400).send({ error: 'platform 和 markdown 为必填项' })
    }

    // Step 1: 规范化
    const normalized = normalize(markdown)

    // Step 2: 可选的覆盖
    if (overrideTitle) normalized.title = overrideTitle
    if (overrideTags) normalized.tags = overrideTags

    // Step 3: 格式转换（用已注册的适配器）
    const adapter = adapterRegistry.get(platform)
    if (!adapter) {
      return reply.status(400).send({ error: `未找到平台适配器: ${platform}` })
    }

    const platformContent: PlatformContent = adapter.adapt(normalized)

    // Step 4: 真实发布（如果该平台有发布器）
    const publisher = publisherRegistry.get(platform)
    if (!publisher) {
      return {
        result: {
          success: false,
          platform,
          message: `平台 ${platform} 暂未实现真实发布功能，请复制内容后手动发布`,
        } as PublishResult,
      } satisfies PublishResponse
    }

    const result = await publisher.publish(platformContent)

    return { result } satisfies PublishResponse
  })

  // 获取支持真实发布的平台列表
  app.get('/publish/platforms', async () => {
    return { platforms: publisherRegistry.listSupported() }
  })

  // 打开登录窗口
  app.post<{ Body: { platform: PlatformType } }>('/publish/login', async (request, reply) => {
    const { platform } = request.body
    const publisher = publisherRegistry.get(platform)
    if (!publisher) {
      return reply.status(400).send({ error: '该平台不支持真实发布' })
    }

    try {
      await publisher.openLogin()
      return { ok: true, message: '登录窗口已打开' }
    } catch (err: any) {
      return { ok: false, message: err.message }
    }
  })
}
