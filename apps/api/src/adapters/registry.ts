import type { PlatformType } from '@multipost/shared'
import type { BasePlatformAdapter } from './base.js'
import { WeChatAdapter } from './wechat.js'
import { ZhihuAdapter } from './zhihu.js'
import { XiaohongshuAdapter } from './xiaohongshu.js'
import { BilibiliAdapter } from './bilibili.js'
import { ToutiaoAdapter } from './toutiao.js'

class AdapterRegistry {
  private adapters = new Map<string, BasePlatformAdapter>()

  register(adapter: BasePlatformAdapter): void {
    this.adapters.set(adapter.platformType, adapter)
  }

  get(platform: PlatformType): BasePlatformAdapter {
    const adapter = this.adapters.get(platform)
    if (!adapter) {
      throw new Error(`未找到平台适配器: ${platform}`)
    }
    return adapter
  }

  listAll(): BasePlatformAdapter[] {
    return Array.from(this.adapters.values())
  }
}

export const adapterRegistry = new AdapterRegistry()

// 注册内置适配器
adapterRegistry.register(new WeChatAdapter())
adapterRegistry.register(new ZhihuAdapter())
adapterRegistry.register(new XiaohongshuAdapter())
adapterRegistry.register(new BilibiliAdapter())
adapterRegistry.register(new ToutiaoAdapter())
