import type { NormalizedContent, PlatformContent, PlatformType, PlatformMeta } from '@multipost/shared'
import { PLATFORM_CONSTRAINTS } from '@multipost/shared'

/**
 * 平台适配器抽象基类
 *
 * 扩展新平台的步骤：
 * 1. 在 packages/shared 的 PlatformType 枚举中添加新平台
 * 2. 在 PLATFORM_CONSTRAINTS 中定义该平台的约束
 * 3. 继承此类，实现 adapt() 方法
 * 4. 在 AdapterRegistry 中注册
 *
 * @example
 * ```ts
 * class JianshuAdapter extends BasePlatformAdapter {
 *   readonly platformType = PlatformType.JIANSHU
 *   readonly platformName = '简书'
 *   readonly description = '中文写作阅读平台，支持 Markdown'
 *   readonly docsUrl = 'https://www.jianshu.com/'
 *
 *   adapt(content: NormalizedContent): PlatformContent {
 *     // 简书支持 Markdown，只需标题截断
 *     return {
 *       platform: PlatformType.JIANSHU,
 *       title: content.title.slice(0, 50),
 *       body: content.bodyMarkdown,
 *       tags: content.tags.slice(0, 5),
 *       summary: content.summary,
 *       warnings: [],
 *     }
 *   }
 * }
 * ```
 */
export abstract class BasePlatformAdapter {
  /** 平台类型标识 */
  abstract readonly platformType: PlatformType
  /** 平台中文名称 */
  abstract readonly platformName: string
  /** 平台简介（用于展示） */
  abstract readonly description: string
  /** 平台帮助/文档链接 */
  abstract readonly docsUrl: string

  /**
   * 将规范化内容转换为平台特定格式
   * 必须由子类实现
   */
  abstract adapt(content: NormalizedContent): PlatformContent

  /**
   * 校验内容是否符合平台规则，返回警告列表
   * 可覆盖，默认不做额外校验
   */
  validate(content: NormalizedContent): string[] {
    return []
  }

  /**
   * 获取平台约束参数
   * 默认从 PLATFORM_CONSTRAINTS 读取
   */
  getConstraints() {
    return PLATFORM_CONSTRAINTS[this.platformType]
  }

  /**
   * 获取平台元数据（供 API 返回给前端）
   */
  getMeta(): PlatformMeta {
    const c = this.getConstraints()
    return {
      type: this.platformType,
      name: this.platformName,
      description: this.description,
      docsUrl: this.docsUrl,
      titleMaxLength: c.titleMaxLength,
      bodyMaxLength: c.bodyMaxLength,
      supportMarkdown: c.supportMarkdown,
      allowExternalLinks: c.allowExternalLinks,
      hashtagMaxCount: c.hashtagMaxCount,
    }
  }
}
