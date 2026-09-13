#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')

function dimensions(file) {
  const data = fs.readFileSync(file)
  // PNG
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
  }
  // JPEG: scan Start Of Frame markers.
  if (data[0] === 0xff && data[1] === 0xd8) {
    for (let i = 2; i < data.length - 9;) {
      if (data[i] !== 0xff) { i += 1; continue }
      const marker = data[i + 1]
      const length = data.readUInt16BE(i + 2)
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: data.readUInt16BE(i + 7), height: data.readUInt16BE(i + 5) }
      }
      i += 2 + length
    }
  }
  return null
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
let removed = 0
let changedProducts = 0

for (const product of products) {
  const images = product.detail_description_images || []
  const kept = []
  for (const relativePath of images) {
    const fullPath = path.join(root, 'public', relativePath)
    if (!fs.existsSync(fullPath)) continue
    const size = dimensions(fullPath)
    // 본문 설명으로 쓰기 어려운 아이콘, 공통 버튼, 구분선을 제거한다.
    const isUiAsset = size && (size.width < 200 || size.height < 100)
    if (isUiAsset) {
      fs.unlinkSync(fullPath)
      removed += 1
    } else {
      kept.push(relativePath)
    }
  }
  if (kept.length !== images.length) {
    product.detail_description_images = kept
    changedProducts += 1
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n')
console.log(JSON.stringify({ removed, changedProducts }))
