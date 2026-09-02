import fs from 'fs'
import path from 'path'

export default function handler(req) {
  try {
    const { file } = req.query
    if (!file || typeof file !== 'string') {
      return new Response('missing file', { status: 400 })
    }

    const decoded = decodeURIComponent(file)
    const rel = decoded.startsWith('/') ? decoded.slice(1) : decoded
    const fullPath = path.join(process.cwd(), rel)

    if (!fs.existsSync(fullPath)) {
      const noImg = path.join(process.cwd(), 'public', 'assets', 'no_image.jpg')
      if (fs.existsSync(noImg)) {
        const data = fs.readFileSync(noImg)
        return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } })
      }
      return new Response('not found', { status: 404 })
    }

    const stat = fs.statSync(fullPath)
    if (!stat.isFile()) return new Response('not found', { status: 404 })

    const data = fs.readFileSync(fullPath)
    const ext = path.extname(fullPath).toLowerCase()
    const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg'

    return new Response(data, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    return new Response('not found', { status: 404 })
  }
}

export const config = {
  runtime: 'nodejs',
}
