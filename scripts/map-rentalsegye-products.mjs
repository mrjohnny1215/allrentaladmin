#!/usr/bin/env node
/**
 * 렌탈세계 상품 목록을 수집해 로컬 상품 DB의 모델명과 대조한다.
 * 기본 동작은 reports/에 결과만 저장한다. --write를 주면 products.json에도 URL을 기록한다.
 * 사용: node scripts/map-rentalsegye-products.mjs [--write]
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const reportDir = path.join(root, 'reports')
const baseUrl = 'https://www.rentalsegye.com'
const targetBrands = new Map([
  ['코웨이', '코웨이'], ['청호나이스', '청호나이스'], ['쿠쿠', '쿠쿠'], ['현대큐밍', '현대큐밍'],
  ['lg', 'LG'], ['lg전자', 'LG'], ['웰스', '웰스'], ['교원웰스', '웰스'], ['kyk', '웰스'], ['세스코', '세스코'],
])
const categoryAliases = new Map([
  ['정수기', '정수기'], ['비데', '비데'], ['공기청정기', '공기청정기'], ['청정기', '공기청정기'],
  ['매트리스', '매트리스'], ['안마의자', '안마의자'],
])

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const normalizeModel = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const normalizeBrand = value => targetBrands.get(String(value || '').trim().toLowerCase()) || null
const decodeHtml = value => String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`

async function fetchText(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'user-agent': 'AllRentalProductMapper/1.0', ...(options.headers || {}) }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.text()
}

function categoriesFromHome(html) {
  const categories = []
  const re = /<a[^>]+href=["']([^"']*product_list\.php\?cid=\d+&gid=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(re)) {
    const text = decodeHtml(match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    const category = categoryAliases.get(text)
    if (!category) continue
    const url = new URL(match[1], baseUrl)
    const cid = url.searchParams.get('cid')
    const gid = url.searchParams.get('gid')
    if (cid && gid && !categories.some(item => item.cid === cid && item.gid === gid)) categories.push({ cid, gid, category })
  }
  return categories
}

function productsFromHtml(html, category) {
  const items = []
  const re = /<a\s+href=["']([^"']*product\.php\?[^"']+)["'][^>]*>[\s\S]*?<div\s+class=["']card-model[^"']*["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<div\s+class=["']card-desc[^"']*["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/a>/gi
  for (const match of html.matchAll(re)) {
    const detailUrl = new URL(match[1], baseUrl).href
    const modelCode = decodeHtml(match[2].replace(/<[^>]*>/g, '').trim())
    const name = decodeHtml(match[3].replace(/<[^>]*>/g, '').trim())
    const brandMatch = name.match(/^\[([^\]]+)]/)
    const brand = normalizeBrand(brandMatch?.[1])
    if (!brand || !modelCode) continue
    items.push({ brand, category, modelCode, normalizedModel: normalizeModel(modelCode), name, detailUrl })
  }
  return items
}

async function crawl() {
  const home = await fetchText(baseUrl)
  const categories = categoriesFromHome(home)
  if (categories.length !== 5) console.warn(`[warn] 대상 카테고리 ${categories.length}/5개 발견`)
  const seen = new Map()
  for (const category of categories) {
    for (let page = 1; page <= 100; page += 1) {
      const body = new URLSearchParams({ cid: category.cid, gid: category.gid, page: String(page), itemsPerPage: '48', sort: 'popularity', order: 'desc' })
      const response = JSON.parse(await fetchText(`${baseUrl}/theme/tlpartner11/page/get_products.php`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body }))
      const items = productsFromHtml(response.html || '', category.category)
      for (const item of items) seen.set(item.detailUrl, item)
      if (!response.hasMore || !items.length) break
      await sleep(250)
    }
  }
  return [...seen.values()]
}

const write = process.argv.includes('--write')
const localProducts = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
const localByKey = new Map()
for (const product of localProducts) {
  const brand = normalizeBrand(product.brand)
  const model = normalizeModel(product.model_code)
  if (!brand || !model) continue
  const key = `${brand}:${model}`
  const group = localByKey.get(key) || []
  group.push(product)
  localByKey.set(key, group)
}

const remoteProducts = await crawl()
const results = []
const matchedLocal = new Set()
for (const remote of remoteProducts) {
  const matches = localByKey.get(`${remote.brand}:${remote.normalizedModel}`) || []
  if (matches.length) {
    for (const product of matches) {
      matchedLocal.add(product.id)
      if (write) {
        product.rentalsegye_detail_url = remote.detailUrl
        product.rentalsegye_category = remote.category
        product.rentalsegye_matched_at = new Date().toISOString()
      }
      results.push({ status: 'matched', localId: product.id, localBrand: product.brand, localModel: product.model_code, remoteBrand: remote.brand, remoteModel: remote.modelCode, category: remote.category, detailUrl: remote.detailUrl })
    }
  } else {
    results.push({ status: 'unmatched_remote', localId: '', localBrand: '', localModel: '', remoteBrand: remote.brand, remoteModel: remote.modelCode, category: remote.category, detailUrl: remote.detailUrl })
  }
}
for (const product of localProducts) {
  const brand = normalizeBrand(product.brand)
  if (brand && !matchedLocal.has(product.id)) results.push({ status: 'unmatched_local', localId: product.id, localBrand: product.brand, localModel: product.model_code, remoteBrand: '', remoteModel: '', category: '', detailUrl: '' })
}

fs.mkdirSync(reportDir, { recursive: true })
const summary = {
  generatedAt: new Date().toISOString(), write,
  crawledRemoteProducts: remoteProducts.length,
  matched: results.filter(row => row.status === 'matched').length,
  unmatchedRemote: results.filter(row => row.status === 'unmatched_remote').length,
  unmatchedLocal: results.filter(row => row.status === 'unmatched_local').length,
}
fs.writeFileSync(path.join(reportDir, 'rentalsegye-mapping-result.json'), JSON.stringify({ summary, results }, null, 2) + '\n')
fs.writeFileSync(path.join(reportDir, 'rentalsegye-mapping-result.csv'), ['status,local_id,local_brand,local_model,remote_brand,remote_model,category,detail_url', ...results.map(row => [row.status, row.localId, row.localBrand, row.localModel, row.remoteBrand, row.remoteModel, row.category, row.detailUrl].map(csv).join(','))].join('\n') + '\n')
if (write) fs.writeFileSync(productsPath, JSON.stringify(localProducts, null, 2) + '\n')
console.log(JSON.stringify(summary))
