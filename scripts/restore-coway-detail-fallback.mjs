#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
let restored = 0

for (const product of products) {
  if (product.brand !== '코웨이' || product.detail_description_images?.length) continue
  // 이미 상품 카드에 사용 중인, 해당 상품의 내부 대표 이미지만 상세 영역에 재사용한다.
  if (product.thumbnail && fs.existsSync(path.join(root, 'public', product.thumbnail))) {
    product.detail_description_images = [product.thumbnail]
    restored += 1
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n')
console.log(JSON.stringify({ restored }))
