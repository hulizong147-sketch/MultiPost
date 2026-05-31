import type { TransformRequest, TransformResponse, PlatformListResponse, PlatformType } from '@multipost/shared'

const BASE_URL = '/api'

export async function transformContent(
  request: TransformRequest,
): Promise<TransformResponse> {
  const res = await fetch(`${BASE_URL}/transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

/** 获取所有已注册平台的元数据 */
export async function fetchPlatforms(): Promise<PlatformListResponse> {
  const res = await fetch(`${BASE_URL}/platforms`)
  if (!res.ok) throw new Error(`获取平台列表失败: HTTP ${res.status}`)
  return res.json()
}

/** 发布结果 */
export interface PublishApiResult {
  success: boolean
  platform: string
  url?: string
  message: string
}

/** 真实发布到指定平台 */
export async function publishToPlatform(
  platform: PlatformType,
  markdown: string,
  title?: string,
  tags?: string[],
): Promise<PublishApiResult> {
  const res = await fetch(`${BASE_URL}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, markdown, title, tags }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '发布请求失败' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.result
}

/** 获取支持真实发布的平台列表 */
export async function fetchPublishPlatforms(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/publish/platforms`)
  if (!res.ok) return []
  const data = await res.json()
  return data.platforms
}

// ===== 图片管理 =====

export interface ImageInfo {
  id: string
  name: string
  url: string
  size: number
  createdAt: string
}

export async function fetchImages(): Promise<ImageInfo[]> {
  const res = await fetch(`${BASE_URL}/images/list`)
  if (!res.ok) throw new Error('获取图片列表失败')
  const data = await res.json()
  return data.images
}

export async function uploadImage(name: string, base64: string): Promise<ImageInfo> {
  const res = await fetch(`${BASE_URL}/images/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data: base64 }),
  })
  if (!res.ok) throw new Error('上传失败')
  return res.json()
}

export async function deleteImage(id: string): Promise<void> {
  await fetch(`${BASE_URL}/images/${id}`, { method: 'DELETE' })
}
