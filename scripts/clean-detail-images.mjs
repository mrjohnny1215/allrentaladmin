#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const cacheDir = path.join(root, 'public', 'data', 'detail_pages')

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

function cacheHtml(url) {
  for (const file of fs.readdirSync(cacheDir)) {
    if (!file.endsWith('.html')) continue
    try {
      if (decodeURIComponent(file.slice(0, -5)) === url) return fs.readFileSync(path.join(cacheDir, file), 'utf8')
    } catch { /* malformed filename */ }
  }
  return null
}

function sourceRecords(html, pageUrl) {
  const records = []
  for (const tag of html.match(/<(?:img|source)\b[^>]*>/gi) || []) {
    const attr = /(?:src|data-src|data-original|data-lazy-src|data-image)\s*=\s*["']([^"']+)["']/i.exec(tag)
    if (!attr) continue
    let src = attr[1].trim().replace(/&amp;/g, '&')
    if (!src || src.startsWith('data:') || /logo|icon|btn|button|banner|event|coupon|gift|thumb|thumbnail|sprite|arrow|sns|kakao|naver|facebook|instagram|youtube|cart|login|footer|header|common|loading|placeholder|no[_-]?image/i.test(src)) continue
    try { src = new URL(src, pageUrl).href } catch { continue }
    if (!/\.(?:avif|jpe?g|png|webp)(?:[?#].*)?$/i.test(src) || !/detail|goods_desc|goods-detail|product|editor|upload|content|prd|item/i.test(src)) continue
    if (!records.some(record => record.src === src)) {
      records.push({ src, relatedCard: /\bid\s*=\s*["']ui_product_img_/i.test(tag), alt: /\balt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] || '' })
    }
  }
  return records
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
const cowayHashes = new Map()
for (const product of products) {
  if (product.brand !== '코웨이') continue
  for (const relativePath of product.detail_description_images || []) {
    const fullPath = path.join(root, 'public', relativePath)
    if (!fs.existsSync(fullPath)) continue
    const hash = fs.readFileSync(fullPath).toString('base64')
    const models = cowayHashes.get(hash) || new Set()
    models.add(relativePath)
    cowayHashes.set(hash, models)
  }
}
// 서로 다른 코웨이 상품 열 개 이상에 완전히 동일한 큰 사진은 공통 홍보 이미지다.
const sharedCowayAssets = new Set([...cowayHashes].filter(([, paths]) => paths.size >= 10).map(([hash]) => hash))
let removed = 0
let changedProducts = 0

for (const product of products) {
  const images = product.detail_description_images || []
  const records = product.detail_url ? sourceRecords(cacheHtml(product.detail_url) || '', product.detail_url) : []
  const kept = []
  for (const relativePath of images) {
    const fullPath = path.join(root, 'public', relativePath)
    if (!fs.existsSync(fullPath)) continue
    const size = dimensions(fullPath)
    // 본문 설명으로 쓰기 어려운 아이콘, 공통 버튼, 구분선을 제거한다.
    const index = Number(path.basename(relativePath).match(/^(\d+)/)?.[1]) - 1
    const source = records[index]
    const compactModel = String(product.model_code || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const compactAlt = String(source?.alt || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const isOtherModel = Boolean(source && (source.relatedCard || (compactModel && /[a-z]{1,5}[\s_-]*\d/i.test(source.alt) && compactAlt && !compactAlt.includes(compactModel))))
    const isUiAsset = size && (size.width < 200 || size.height < 100)
    const isSharedCowayAsset = product.brand === '코웨이' && sharedCowayAssets.has(fs.readFileSync(fullPath).toString('base64'))
    if (isUiAsset || isOtherModel || isSharedCowayAsset) {
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
