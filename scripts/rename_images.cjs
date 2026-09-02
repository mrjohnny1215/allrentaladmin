const fs = require('fs')
const path = require('path')

const root = path.join(process.cwd(), 'public')
const goodsDetailDir = path.join(root, 'assets', 'goods_detail')
const goodsImageDir = path.join(root, 'assets', 'goods_image')

function renameFiles(dir, prefix) {
  if (!fs.existsSync(dir)) return 0
  const files = fs.readdirSync(dir)
  let count = 0
  files.forEach((f, idx) => {
    const srcPath = path.join(dir, f)
    if (!fs.statSync(srcPath).isFile()) return
    const ext = path.extname(f)
    const base = path.basename(f, ext)
    if (/^[A-Za-z0-9_\-]+$/.test(base)) return
    const safe = base.replace(/[^A-Za-z0-9\-_]/g, '_').replace(/_+/g, '_')
    const newName = `${prefix}_${String(idx).padStart(4, '0')}${ext}`
    const dstPath = path.join(dir, newName)
    if (!fs.existsSync(dstPath)) {
      fs.renameSync(srcPath, dstPath)
      count++
    }
  })
  return count
}

const d1 = renameFiles(goodsDetailDir, 'gd')
const d2 = renameFiles(goodsImageDir, 'gi')
console.log(`Renamed: goods_detail=${d1}, goods_image=${d2}`)
