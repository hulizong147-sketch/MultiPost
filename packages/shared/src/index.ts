// 平台类型枚举
export enum PlatformType {
  WECHAT_MP = 'wechat_mp',
  ZHIHU = 'zhihu',
  XIAOHONGSHU = 'xiaohongshu',
  BILIBILI = 'bilibili',
  TOUTIAO = 'toutiao',
  CSDN = 'csdn',
}

// 规范化内容（平台无关的中间表示）
export interface NormalizedContent {
  title: string
  bodyMarkdown: string
  bodyHtml: string
  images: ImageAsset[]
  tags: string[]
  summary: string
}

export interface ImageAsset {
  url: string
  alt: string
  width?: number
  height?: number
}

// 平台适配后的输出
export interface PlatformContent {
  platform: PlatformType
  title: string
  body: string
  tags: string[]
  summary: string
  warnings: string[]
}

// API 请求
export interface TransformRequest {
  markdown: string
  platforms: PlatformType[]
}

// API 响应
export interface TransformResponse {
  results: Record<string, PlatformContent>
}

// 平台元数据（供前端动态发现平台）
export interface PlatformMeta {
  type: PlatformType
  name: string
  description: string
  docsUrl: string
  titleMaxLength: number
  bodyMaxLength: number | null
  supportMarkdown: boolean
  allowExternalLinks: boolean
  hashtagMaxCount: number
}

// 平台列表 API 响应
export interface PlatformListResponse {
  platforms: PlatformMeta[]
}

// 平台约束常量
export const PLATFORM_CONSTRAINTS: Record<PlatformType, {
  name: string
  titleMaxLength: number
  bodyMaxLength: number | null
  summaryMaxLength: number
  imageRatio: string
  supportMarkdown: boolean
  allowExternalLinks: boolean
  hashtagMaxCount: number
}> = {
  [PlatformType.WECHAT_MP]: {
    name: '微信公众号',
    titleMaxLength: 64,
    bodyMaxLength: null,
    summaryMaxLength: 120,
    imageRatio: '2.35:1',
    supportMarkdown: false,
    allowExternalLinks: false,
    hashtagMaxCount: 0,
  },
  [PlatformType.ZHIHU]: {
    name: '知乎',
    titleMaxLength: 100,
    bodyMaxLength: null,
    summaryMaxLength: 200,
    imageRatio: '16:9',
    supportMarkdown: true,
    allowExternalLinks: true,
    hashtagMaxCount: 5,
  },
  [PlatformType.XIAOHONGSHU]: {
    name: '小红书',
    titleMaxLength: 20,
    bodyMaxLength: 1000,
    summaryMaxLength: 0,
    imageRatio: '3:4',
    supportMarkdown: false,
    allowExternalLinks: false,
    hashtagMaxCount: 10,
  },
  [PlatformType.BILIBILI]: {
    name: 'B站',
    titleMaxLength: 40,
    bodyMaxLength: null,
    summaryMaxLength: 200,
    imageRatio: '16:9',
    supportMarkdown: false,
    allowExternalLinks: true,
    hashtagMaxCount: 5,
  },
  [PlatformType.TOUTIAO]: {
    name: '头条',
    titleMaxLength: 30,
    bodyMaxLength: null,
    summaryMaxLength: 100,
    imageRatio: '16:9',
    supportMarkdown: false,
    allowExternalLinks: false,
    hashtagMaxCount: 3,
  },
  [PlatformType.CSDN]: {
    name: 'CSDN',
    titleMaxLength: 100,
    bodyMaxLength: null,
    summaryMaxLength: 200,
    imageRatio: '16:9',
    supportMarkdown: true,
    allowExternalLinks: true,
    hashtagMaxCount: 5,
  },
}
