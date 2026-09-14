#!/usr/bin/env node
// 쿠쿠 상세 본문에는 설치 실사와 사용 환경 사진이 섞여 있어 노출하지 않는다.
// 상품별 내부 대표 이미지만 상세 영역에 유지한다.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
let updated = 0
let missing = 0

for (const product of products) {
  if (product.brand !== '쿠쿠') continue
  const fallback = [product.thumbnail, ...(product.images || [])]
    .find(src => src && fs.existsSync(path.join(root, 'public', src)))
  if (fallback) {
    product.detail_description_images = [fallback]
    updated += 1
  } else {
    product.detail_description_images = []
    missing += 1
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ brand: '쿠쿠', updated, missing }))
