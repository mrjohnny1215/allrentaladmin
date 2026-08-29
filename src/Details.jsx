import React, { useState, useEffect } from 'react'

const BRANDS = ['코웨이', '청호나이스', '쿠쿠', 'SK매직', '현대큐밍', 'LG', '웰스', '세스코']

export default function Details() {
  const [all, setAll] = useState([])
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState('price_asc')

  useEffect(() => {
    fetch('/data/products.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : [])
      .then(setAll)
      .catch(() => setAll([]))
  }, [])

  const list = all
    .filter((p) => {
      if (!brand) return true
      const b = (p.brand || '').trim()
      return b === brand
    })
    .sort((a, b) => {
      const priceA = Number(a.min_monthly_fee || 0)
      const priceB = Number(b.min_monthly_fee || 0)
      if (sort === 'price_asc') return priceA - priceB
      if (sort === 'price_desc') return priceB - priceA
      return 0
    })

  return (
    <div style={{ padding: 24 }}>
      <h2>제품비교</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">브랜드 전체</option>
          {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="price_asc">렌탈료 낮은순</option>
          <option value="price_desc">렌탈료 높은순</option>
        </select>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>브랜드</th><th>상품명</th><th>모델</th><th>렌탈료</th></tr></thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={idx}>
              <td>{p.brand}</td>
              <td>{p.name}</td>
              <td>{p.model_code || '-'}</td>
              <td>{(p.min_monthly_fee || 0).toLocaleString()}원~</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
