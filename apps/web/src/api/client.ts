import type { TransformRequest, TransformResponse } from '@multipost/shared'

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
