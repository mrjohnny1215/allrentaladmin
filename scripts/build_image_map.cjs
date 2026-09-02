const fs = require('fs')
const path = require('path')

const dirs = [
  { dir: path.join(process.cwd(), 'public/assets/goods_detail'), prefix: 'gd' },
  { dir: path.join(process.cwd(), 'public/assets/goods_image'), prefix: 'gi' },
]

const map = {}
dirs.forEach(({ dir, prefix }) => {
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile())
  files.forEach((f, idx) => {
    const ext = path.extname(f)
    const base = path.basename(f, ext)
    if (/^[A-Za-z0-9_\-]+$/.test(base)) return // 이미 ascii
    const key = `/assets/${dir.split('/assets/')[1]}/${f}`
    const val = `/assets/${dir.split('/assets/')[1]}/${prefix}_${String(idx).padStart(4, '0')}${ext}`
    map[key] = val
  })
})

fs.writeFileSync(path.join(process.cwd(), 'public', 'images_map.json'), JSON.stringify(map, null, 2))
console.log('Mapped:', Object.keys(map).length)
