import fs from 'fs'
import path from 'path'

const CANDIDATES = [
  process.cwd(),
  path.join(process.cwd(), 'public'),
  '/vercel/output',
  '/vercel/output/public',
]

export default function handler(req) {
  try {
    const { file } = req.query
    if (!file || typeof file !== 'string') {
      return new Response('missing file', { status: 400 })
    }

    const decoded = decodeURIComponent(file)
    const rel = decoded.startsWith('/') ? decoded.slice(1) : decoded

    let fullPath = null
    for (const base of CANDIDATES) {
      const candidate = path.join(base, rel)
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        fullPath = candidate
        break
      }
    }

    if (!fullPath) {
      const noImgCandidates = CANDIDATES.flatMap((base) => [
        path.join(base, 'assets', 'no_image.jpg'),
        path.join(base, 'public', 'assets', 'no_image.jpg'),
        path.join(base, 'assets', 'goods_image', 'no_image.jpg'),
      ])
      for (const candidate of noImgCandidates) {
        if (fs.existsSync(candidate)) {
          const data = fs.readFileSync(candidate)
          return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } })
        }
      }
      return new Response('not found', { status: 404 })
    }

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
