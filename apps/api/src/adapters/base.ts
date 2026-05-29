import type { NormalizedContent, PlatformContent, PlatformType } from '@multipost/shared'

/**
 * 平台适配器抽象基类
 * 所有平台适配器必须继承此类并实现抽象方法
 */
export abstract class BasePlatformAdapter {
  abstract readonly platformType: PlatformType
  abstract readonly platformName: string

  /**
   * 将规范化内容转换为平台特定格式
   */
  abstract adapt(content: NormalizedContent): PlatformContent

  /**
   * 校验内容是否符合平台规则，返回警告列表
   */
  validate(content: NormalizedContent): string[] {
    return []
  }
}
