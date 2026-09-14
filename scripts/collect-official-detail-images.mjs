#!/usr/bin/env node
/**
 * 상품 상세페이지의 본문 이미지를 프로젝트 내부(public/images/details)에 저장한다.
 * - 기존에 보관된 원본 HTML을 우선 이용하고, 없는 경우 상세 URL을 요청한다.
 * - 로고·아이콘·배너·썸네일은 제외한다.
 * - 각 상품 처리 후 products.json을 갱신해 중단 후에도 이어받을 수 있다.
 *
 * 사용: node scripts/collect-official-detail-images.mjs [--limit=10]
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const cacheDir = path.join(root, 'public', 'data', 'detail_pages')
const outRoot = path.join(root, 'public', 'images', 'details')
const limit = Number(process.argv.find(x => x.startsWith('--limit='))?.split('=')[1] || 0)
const userAgent = 'Mozilla/5.0 (compatible; AllRentalProductDetailCollector/1.0)'
const maxImagesPerProduct = 24
const maxImageBytes = 5 * 1024 * 1024
const skipWords = /logo|icon|btn|button|banner|event|coupon|gift|thumb|thumbnail|sprite|arrow|sns|kakao|naver|facebook|instagram|youtube|cart|login|footer|header|common|loading|placeholder|no[_-]?image/i
const bodyWords = /detail|goods_desc|goods-detail|product|editor|upload|content|prd|item/i

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const safe = value => String(value || 'unknown').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
const brandDir = brand => ({ '코웨이': 'coway', '청호나이스': 'chungho', 'SK매직': 'skmagic', '쿠쿠': 'cuckoo', '웰스': 'wells', '세스코': 'cesco', '현대큐밍': 'hdquming', 'LG': 'lg' }[brand] || safe(brand))

function cacheHtml(url) {
  for (const file of fs.readdirSync(cacheDir)) {
    if (!file.endsWith('.html')) continue
    try {
      if (decodeURIComponent(file.slice(0, -5)) === url) return fs.readFileSync(path.join(cacheDir, file), 'utf8')
    } catch { /* malformed legacy filename */ }
  }
  return null
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml' }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`page HTTP ${response.status}`)
  return { html: await response.text(), finalUrl: response.url }
}

function imageUrls(html, pageUrl, modelCode = '') {
  const found = []
  const tags = html.match(/<(?:img|source)\b[^>]*>/gi) || []
  for (const tag of tags) {
    const attr = /(?:src|data-src|data-original|data-lazy-src|data-image)\s*=\s*["']([^"']+)["']/i.exec(tag)
    if (!attr) continue
    let src = attr[1].trim().replace(/&amp;/g, '&')
    if (!src || src.startsWith('data:') || skipWords.test(src)) continue
    const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] || ''
    const compactModel = String(modelCode).replace(/[^a-z0-9]/gi, '').toLowerCase()
    const compactAlt = alt.replace(/[^a-z0-9]/gi, '').toLowerCase()
    // 판매 페이지의 추천상품 카드에는 다른 모델 번호가 alt/id로 표시된다.
    if (/\bid\s*=\s*["']ui_product_img_/i.test(tag)) continue
    if (compactModel && /[a-z]{1,5}[\s_-]*\d/i.test(alt) && compactAlt && !compactAlt.includes(compactModel)) continue
    try { src = new URL(src, pageUrl).href } catch { continue }
    if (!/\.(?:avif|jpe?g|png|webp)(?:[?#].*)?$/i.test(src) || !bodyWords.test(src)) continue
    if (!found.includes(src)) found.push(src)
  }
  return found.slice(0, maxImagesPerProduct)
}

function extFrom(url, type) {
  if (/webp/i.test(type) || /\.webp(?:[?#]|$)/i.test(url)) return '.webp'
  if (/png/i.test(type) || /\.png(?:[?#]|$)/i.test(url)) return '.png'
  if (/avif/i.test(type) || /\.avif(?:[?#]|$)/i.test(url)) return '.avif'
  return '.jpg'
}

async function download(url, dest) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent, accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
  const type = response.headers.get('content-type') || ''
  const bytes = Number(response.headers.get('content-length') || 0)
  if (!response.ok || !type.startsWith('image/') || (bytes && bytes > maxImageBytes)) return false
  const data = Buffer.from(await response.arrayBuffer())
  if (data.length < 2048 || data.length > maxImageBytes) return false
  fs.writeFileSync(dest, data)
  return true
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
let done = 0, savedProducts = 0, savedImages = 0, failed = 0

for (const product of products) {
  const existing = product.detail_description_images || []
  if (!product.detail_url || (existing.length && existing.every(src => fs.existsSync(path.join(root, 'public', src))))) continue
  if (limit && done >= limit) break
  done += 1
  const model = safe(product.model_code || product.id || product.name)
  const folder = path.join(outRoot, brandDir(product.brand), model)
  fs.mkdirSync(folder, { recursive: true })
  try {
    const cached = cacheHtml(product.detail_url)
    const { html, finalUrl } = cached ? { html: cached, finalUrl: product.detail_url } : await fetchText(product.detail_url)
    const urls = imageUrls(html, finalUrl, product.model_code)
    const local = []
    for (const [index, url] of urls.entries()) {
      const base = `${String(index + 1).padStart(2, '0')}`
      // 일부 제조사 CDN은 HEAD 요청을 지연하거나 차단한다. GET 한 번으로 검증·저장을 함께 한다.
      const ext = extFrom(url, '')
      const file = `${base}${ext}`
      const dest = path.join(folder, file)
      const relative = `/images/details/${brandDir(product.brand)}/${model}/${file}`
      if (fs.existsSync(dest) && fs.statSync(dest).size >= 2048) { local.push(relative); continue }
      if (await download(url, dest).catch(() => false)) { local.push(relative); savedImages += 1 }
      await sleep(100)
    }
    if (local.length) { product.detail_description_images = local; savedProducts += 1 }
    else failed += 1
  } catch (error) {
    failed += 1
    console.warn(`[skip] ${product.model_code || product.name}: ${error.message}`)
  }
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n', 'utf8')
  console.log(`[${done}] ${product.brand} ${product.model_code || product.name}: ${product.detail_description_images?.length || 0} images`)
  await sleep(250)
}

console.log(JSON.stringify({ processed: done, productsWithImages: savedProducts, imagesSaved: savedImages, failed }))
