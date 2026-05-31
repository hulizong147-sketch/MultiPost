import { FastifyInstance } from 'fastify'
import path from 'path'
import os from 'os'
import fs from 'fs'
import crypto from 'crypto'

const IMG_DIR = path.join(os.homedir(), '.multipost', 'images')
fs.mkdirSync(IMG_DIR, { recursive: true })

interface ImageInfo {
  id: string
  name: string
  url: string
  size: number
  createdAt: string
}

export async function imageRoutes(app: FastifyInstance) {
  // 列表
  app.get('/images/list', async () => {
    const files = fs.readdirSync(IMG_DIR).filter(f => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f))
    const diag = 'LIST:' + files.length + '\n' + files.map(f => '  ' + path.join(IMG_DIR, f)).join('\n')
    fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'img-diag.txt'), diag, 'utf-8')
    return {
      images: files.map(f => {
        const fp = path.join(IMG_DIR, f)
        const stat = fs.statSync(fp)
        return {
          id: f,
          name: f,
          url: `/api/images/file/${f}`,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        } as ImageInfo
      }),
    }
  })

  // 上传 (base64)
  app.post('/images/upload', async (request, reply) => {
    const { name, data } = request.body as { name: string; data: string }
    if (!data) return reply.status(400).send({ error: '没有文件数据' })

    const ext = path.extname(name) || '.png'
    const id = crypto.randomBytes(8).toString('hex') + ext
    const fp = path.join(IMG_DIR, id)

    const buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    fs.writeFileSync(fp, buf)
    fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'img-diag.txt'), 'UPLOAD: ' + name + ' (' + buf.length + ' bytes)', 'utf-8')
    return { id, name, url: `/api/images/file/${id}`, size: buf.length }
  })

  // 删除
  app.delete('/images/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const fp = path.join(IMG_DIR, id)
    if (!fs.existsSync(fp)) return reply.status(404).send({ error: '文件不存在' })
    fs.unlinkSync(fp)
    return { ok: true }
  })

  // 文件读取
  app.get('/images/file/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const fp = path.join(IMG_DIR, id)
    if (!fs.existsSync(fp)) return reply.status(404).send({ error: '文件不存在' })
    const ext = path.extname(id).toLowerCase()
    const mime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
    return reply.type(mime[ext] || 'image/png').send(fs.createReadStream(fp))
  })
}
