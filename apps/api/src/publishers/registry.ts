import type { PlatformContent, PlatformType } from '@multipost/shared'
import type { BasePublisher, PublishResult } from './base.js'
import { csdnPublisher } from './csdn.js'

/**
 * 发布器注册中心
 *
 * 注册、查找、执行发布操作。
 * 与 AdapterRegistry 并行设计，每个平台可以同时有 Adapter（格式转换）和 Publisher（真实发布）。
 */
class PublisherRegistry {
  private publishers = new Map<string, BasePublisher>()

  register(publisher: BasePublisher): void {
    this.publishers.set(publisher.platformType, publisher)
  }

  get(platform: PlatformType): BasePublisher | undefined {
    return this.publishers.get(platform)
  }

  /** 执行发布 */
  async publish(platform: PlatformType, content: PlatformContent): Promise<PublishResult> {
    const publisher = this.publishers.get(platform)
    if (!publisher) {
      return {
        success: false,
        platform,
        message: `平台 ${platform} 暂不支持真实发布（仅格式转换）`,
      }
    }
    return publisher.publish(content)
  }

  /** 列出所有已注册的发布器 */
  listSupported(): PlatformType[] {
    return Array.from(this.publishers.keys()) as PlatformType[]
  }
}

export const publisherRegistry = new PublisherRegistry()

// 注册已实现的发布器
publisherRegistry.register(csdnPublisher)
