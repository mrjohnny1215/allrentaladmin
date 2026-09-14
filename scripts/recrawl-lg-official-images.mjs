#!/usr/bin/env node
/**
 * LG 제품 상세 이미지를 모델별 공식 상세 페이지의 og:image 하나로 재구성한다.
 * 페이지 본문에 섞인 캠페인/추천 이미지가 상세 영역에 노출되는 것을 막기 위한
 * 보수적인 수집기다.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const outputRoot = path.join(root, 'public', 'images', 'details', 'lg')
const userAgent = 'Mozilla/5.0 (compatible; AllRentalOfficialImageCollector/2.0)'

const safe = value => String(value || 'unknown').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
const htmlDecode = value => value.replace(/&amp;/g, '&')

function ogImage(html) {
  const match = /<meta\s+(?:[^>]*?\s)?property=["']og:image["'](?:\s+[^>]*)?>/i.exec(html)
    || /<meta\s+(?:[^>]*?\s)?content=["']([^"']+)["'](?:\s+[^>]*?)?property=["']og:image["'][^>]*>/i.exec(html)
  if (!match) return null
  const tag = match[0]
  const content = /content=["']([^"']+)["']/i.exec(tag)?.[1]
  return content ? htmlDecode(content) : null
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`page HTTP ${response.status}`)
  return response.text()
}

async function saveImage(url, destination) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent, accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' }, signal: AbortSignal.timeout(30000) })
  const type = response.headers.get('content-type') || ''
  if (!response.ok || !type.startsWith('image/')) throw new Error(`image HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  // LG의 공식 대표 상품 이미지는 최적화돼 수 KB인 경우가 있다.
  if (bytes.length < 2_000 || bytes.length > 8 * 1024 * 1024) throw new Error(`invalid image size ${bytes.length}`)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, bytes)
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
const lgProducts = products.filter(product => product.brand === 'LG' && product.detail_url)
let replaced = 0
let failed = 0

for (const product of lgProducts) {
  const current = product.detail_description_images || []
  if (current.length === 1 && /\/official-main\.jpg$/i.test(current[0]) && fs.existsSync(path.join(root, 'public', current[0]))) {
    console.log(JSON.stringify({ event: 'kept', model: product.model_code }))
    continue
  }
  try {
    const html = await fetchText(product.detail_url)
    const source = ogImage(html)
    if (!source) throw new Error('missing og:image')
    const model = safe(product.model_code || product.id)
    const relative = `/images/details/lg/${model}/official-main.jpg`
    await saveImage(source, path.join(root, 'public', relative))
    product.detail_description_images = [relative]
    replaced += 1
    console.log(JSON.stringify({ event: 'replaced', model: product.model_code, source }))
  } catch (error) {
    // 공식 페이지가 폐기된 모델은 타 모델 사진 대신, 이미 이 상품 카드에 쓰이는
    // 내부 대표 이미지만 상세 영역의 안전한 대체 이미지로 쓴다.
    const fallback = [product.thumbnail, ...(product.images || [])]
      .find(src => src && fs.existsSync(path.join(root, 'public', src)))
    product.detail_description_images = fallback ? [fallback] : []
    failed += 1
    console.warn(JSON.stringify({ event: 'fallback', model: product.model_code, fallback: Boolean(fallback), error: error.message }))
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ event: 'complete', lgProducts: lgProducts.length, replaced, failed }))
