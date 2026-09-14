#!/usr/bin/env node
// 청호나이스 공식 본문 이미지는 광고/추천 상품이 섞여 있어 제거한 상태다.
// 상세 영역을 비워 두지 않도록, 각 상품 카드에 이미 쓰이는 본인 대표 사진만 안전하게 사용한다.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
let restored = 0
let missing = 0

for (const product of products) {
  if (product.brand !== '청호나이스' || product.detail_description_images?.length) continue
  const candidate = [product.thumbnail, ...(product.images || [])]
    .find(src => src && fs.existsSync(path.join(root, 'public', src)))
  if (candidate) {
    product.detail_description_images = [candidate]
    restored += 1
  } else {
    missing += 1
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ brand: '청호나이스', restored, missing }))
