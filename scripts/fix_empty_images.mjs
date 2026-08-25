import fs from 'fs'
import path from 'path'

const p = JSON.parse(fs.readFileSync('public/data/products.json', 'utf8'))
const imgDir = 'public/assets/goods_image'

const files = fs.readdirSync(imgDir).map(f => `/assets/goods_image/${f}`)
const byBase = {}
for (const f of files) {
  const base = path.basename(f).replace(/\.\w+$/, '').replace(/-\d+$/, '').trim()
  if (!byBase[base]) byBase[base] = []
  byBase[base].push(f)
}

let patched = 0
for (const item of p) {
  if (Array.isArray(item.images) && item.images.length) continue
  if (!item.thumbnail) continue
  const tb = path.basename(item.thumbnail).replace(/\.\w+$/, '').trim()
  const matches = byBase[tb] || []
  if (matches.length) {
    item.images = matches.slice(0, 6)
    if (!item.thumbnail && matches[0]) item.thumbnail = matches[0]
    patched++
  }
}

fs.writeFileSync('public/data/products.json', JSON.stringify(p, null, 2))
console.log('patched', patched)
