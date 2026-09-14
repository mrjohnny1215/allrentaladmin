#!/usr/bin/env node
// 웰스 상세 본문에 다른 모델 이미지가 섞이는 문제를 막기 위해
// 각 상품의 자체 대표 이미지만 상세 영역에 사용한다.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
let updated = 0
let missing = 0

for (const product of products) {
  if (product.brand !== '웰스') continue
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
console.log(JSON.stringify({ brand: '웰스', updated, missing }))
