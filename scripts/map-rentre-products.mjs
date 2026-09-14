#!/usr/bin/env node
/**
 * 렌트리 5개 가전 카테고리를 페이지 단위로 수집해 내부 상품 모델명과 매핑한다.
 * 기본값은 reports/ 결과 생성만 수행한다. --write 사용 시 products.json에 rentre_catalog을 기록한다.
 * 사용: node scripts/map-rentre-products.mjs [--write]
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const productsPath = path.join(root, 'public', 'data', 'products.json')
const reportDir = path.join(root, 'reports')
const baseUrl = 'https://rentre.kr'
const categories = [
  ['water-purifier', '정수기'], ['air-purifier', '공기청정기'], ['bidet', '비데'],
  ['mattress', '매트리스'], ['massage-chair', '안마의자'],
]
const brandAliases = new Map([
  ['코웨이', '코웨이'], ['coway', '코웨이'], ['청호', '청호나이스'], ['청호나이스', '청호나이스'], ['chungho', '청호나이스'],
  ['쿠쿠', '쿠쿠'], ['cuckoo', '쿠쿠'], ['sk매직', 'SK매직'], ['skmagic', 'SK매직'], ['현대큐밍', '현대큐밍'],
  ['lg', 'LG'], ['lg전자', 'LG'], ['웰스', '웰스'], ['교원웰스', '웰스'], ['kyk', '웰스'], ['세스코', '세스코'],
])

const normalizeModel = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const normalizeBrand = value => brandAliases.get(String(value || '').trim().toLowerCase()) || null
const unescapeRsc = value => String(value || '').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`

async function pageHtml(categoryPath, page) {
  const response = await fetch(`${baseUrl}/${categoryPath}?page=${page}`, { headers: { 'user-agent': 'AllRentalRentreMapper/1.0' }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${response.status} ${categoryPath} page ${page}`)
  return unescapeRsc(await response.text())
}

function recordsFromPage(html, category) {
  const records = []
  // Next.js hydration data contains this sequence for each product card.
  const re = /"prodOptionUsid":(\d+)[\s\S]{0,1200}?"prodOptionThumImgUrl":"([^"]*)"[\s\S]{0,1200}?"prodName":"([^"]*)"[\s\S]{0,1200}?"prodOptionModelCode":"([^"]*)"[\s\S]{0,800}?"prodCatgKorean":"([^"]*)"[\s\S]{0,800}?"rentalCompany":"([^"]*)"/g
  for (const match of html.matchAll(re)) {
    const [, optionId, thumbnailUrl, name, modelCode, categoryName, rentalCompany] = match
    const brand = normalizeBrand(rentalCompany)
    if (!brand || !modelCode) continue
    records.push({
      brand, category: categoryName || category, modelCode, normalizedModel: normalizeModel(modelCode), name,
      detailUrl: `${baseUrl}/product/${optionId}/${encodeURIComponent(name).replace(/%20/g, '-')}`,
      thumbnailUrl,
    })
  }
  return records
}

async function crawlRentre() {
  const seen = new Map()
  for (const [categoryPath, categoryName] of categories) {
    console.log(JSON.stringify({ event: 'category_started', category: categoryName }))
    let emptyPages = 0
    for (let page = 1; page <= 150 && emptyPages < 1; page += 1) {
      let html
      try {
        html = await pageHtml(categoryPath, page)
      } catch (error) {
        if (String(error.message).startsWith('404 ')) break
        throw error
      }
      const records = recordsFromPage(html, categoryName)
      const before = seen.size
      for (const record of records) seen.set(record.detailUrl, record)
      console.log(JSON.stringify({ event: 'page', category: categoryName, page, records: records.length, collected: seen.size }))
      if (!records.length || seen.size === before) emptyPages += 1
      await sleep(150)
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
  const records = localByKey.get(key) || []
  records.push(product)
  localByKey.set(key, records)
}

const remoteProducts = await crawlRentre()
const results = []
const matchedIds = new Set()
for (const remote of remoteProducts) {
  const matches = localByKey.get(`${remote.brand}:${remote.normalizedModel}`) || []
  if (!matches.length) {
    results.push({ status: 'unmatched_remote', localId: '', localBrand: '', localModel: '', remoteBrand: remote.brand, remoteModel: remote.modelCode, category: remote.category, detailUrl: remote.detailUrl })
    continue
  }
  for (const product of matches) {
    matchedIds.add(product.id)
    if (write) {
      product.rentre_catalog = {
        productName: remote.name,
        modelCode: remote.modelCode,
        category: remote.category,
        detailUrl: remote.detailUrl,
        thumbnailUrl: remote.thumbnailUrl,
        updatedAt: new Date().toISOString(),
      }
    }
    results.push({ status: 'matched', localId: product.id, localBrand: product.brand, localModel: product.model_code, remoteBrand: remote.brand, remoteModel: remote.modelCode, category: remote.category, detailUrl: remote.detailUrl })
  }
}
for (const product of localProducts) {
  if (normalizeBrand(product.brand) && !matchedIds.has(product.id)) results.push({ status: 'unmatched_local', localId: product.id, localBrand: product.brand, localModel: product.model_code, remoteBrand: '', remoteModel: '', category: '', detailUrl: '' })
}

fs.mkdirSync(reportDir, { recursive: true })
const summary = { generatedAt: new Date().toISOString(), write, crawledRemoteProducts: remoteProducts.length, matched: results.filter(row => row.status === 'matched').length, unmatchedRemote: results.filter(row => row.status === 'unmatched_remote').length, unmatchedLocal: results.filter(row => row.status === 'unmatched_local').length }
fs.writeFileSync(path.join(reportDir, 'rentre-mapping-result.json'), JSON.stringify({ summary, results }, null, 2) + '\n')
fs.writeFileSync(path.join(reportDir, 'rentre-mapping-result.csv'), ['status,local_id,local_brand,local_model,remote_brand,remote_model,category,detail_url', ...results.map(row => [row.status, row.localId, row.localBrand, row.localModel, row.remoteBrand, row.remoteModel, row.category, row.detailUrl].map(csv).join(','))].join('\n') + '\n')
if (write) fs.writeFileSync(productsPath, JSON.stringify(localProducts, null, 2) + '\n')
console.log(JSON.stringify(summary))
