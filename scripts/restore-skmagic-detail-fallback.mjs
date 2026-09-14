#!/usr/bin/env node
// 상세 이미지가 비어 있는 SK매직 상품에만 본인 대표 사진을 사용한다.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
let restored = 0
let missing = 0

for (const product of products) {
  if (product.brand !== 'SK매직' || product.detail_description_images?.length) continue
  const fallback = [product.thumbnail, ...(product.images || [])]
    .find(src => src && fs.existsSync(path.join(root, 'public', src)))
  if (fallback) {
    product.detail_description_images = [fallback]
    restored += 1
  } else {
    missing += 1
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ brand: 'SK매직', restored, missing }))
