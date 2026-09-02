import React, { useState, useEffect, useMemo } from 'react'
import './receipt.css'

const BRANDS = ['전체', '코웨이', '청호나이스', '쿠쿠', 'SK매직', '현대큐밍', 'LG', '웰스', '세스코']
const PRODUCT_GROUPS = ['전체', '정수기', '공기청정기', '비데', '매트리스', '안마의자', '제빙기', '커피', '얼음냉온', '기타']
const MGMT_CYCLE = ['전체', '2개월', '3개월', '4개월', '6개월', '12개월']
const SORT_OPTS = [
  { value: 'price_asc', label: '렌탈료 낮은순' },
  { value: 'price_desc', label: '렌탈료 높은순' },
  { value: 'commission_asc', label: '수수료 낮은순' },
  { value: 'commission_desc', label: '수수료 높은순' },
]

const CONTRACT_OPTS = ['전체', '3년', '4년', '5년', '6년', '7년', '9년']
const NO_IMG = '/assets/goods_image/no_image.jpg'
const won = (n) => (n ? Number(n).toLocaleString('ko-KR') : '0')

export default function Details() {
  const [all, setAll] = useState([])
  const [group, setGroup] = useState('전체')
  const [mgmt, setMgmt] = useState('전체')
  const [contractFilter, setContractFilter] = useState('전체')
  const [sort, setSort] = useState('price_asc')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [keyword, setKeyword] = useState('')
  const [brand, setBrand] = useState('전체')
  const [headerFilterReset, setHeaderFilterReset] = useState(0)

  useEffect(() => {
    fetch('/data/products.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(setAll)
      .catch(() => setAll([]))
  }, [])

  const list = useMemo(() => {
    let rows = all
    if (group !== '전체') {
      rows = rows.filter(p => (p.category || '').includes(group) || (p.name || '').includes(group))
    }
    if (mgmt !== '전체') {
      rows = rows.filter(p => (p.pricing_matrix || []).some(r => (r.mgmt || r.mgmt_cycle || '') === mgmt))
    }
    if (contractFilter !== '전체') {
      rows = rows.filter(p => (p.pricing_matrix || []).some(r => (r.years || '') === contractFilter))
    }
    if (brand !== '전체') {
      const b = (brand || '').trim()
      rows = rows.filter(p => (p.brand || '').trim() === b)
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      rows = rows.filter(p => `${p.name || ''} ${p.model_code || ''} ${p.brand || ''}`.toLowerCase().includes(kw))
    }
    if (priceMin) {
      rows = rows.filter(p => (Number(p.min_monthly_fee) || 0) >= parseInt(priceMin, 10))
    }
    if (priceMax) {
      rows = rows.filter(p => (Number(p.min_monthly_fee) || 0) <= parseInt(priceMax, 10))
    }
    rows = [...rows].sort((a, b) => {
      if (sort === 'price_asc') return (Number(a.min_monthly_fee) || 0) - (Number(b.min_monthly_fee) || 0)
      if (sort === 'price_desc') return (Number(b.min_monthly_fee) || 0) - (Number(a.min_monthly_fee) || 0)
      if (sort === 'commission_asc') return (Number(a.rep_commission || 0) - Number(b.rep_commission || 0))
      if (sort === 'commission_desc') return (Number(b.rep_commission || 0) - Number(a.rep_commission || 0))
      return 0
    })
    return rows
  }, [all, group, mgmt, contractFilter, sort, priceMin, priceMax, keyword, brand, headerFilterReset])

  const resetFilters = () => {
    setGroup('전체'); setMgmt('전체'); setContractFilter('전체'); setBrand('전체')
    setSort('price_asc'); setPriceMin(''); setPriceMax(''); setKeyword('')
    setHeaderFilterReset(v => v + 1)
  }

  const matrixRow = (matrix, years, field) => {
    if (!matrix || !matrix.length) return '-'
    const row = matrix.find(r => r.years === years)
    if (!row) return '-'
    if (field === 'mgmt') return row.mgmt || row.mgmt_cycle || '-'
    if (field === 'fee') return won(row.monthly_fee)
    if (field === 'support') return row.commission ? won(row.commission) : '-'
    return '-'
  }

  return (
    <div className="details-root" style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 900 }}>제품비교</h2>

      {/* 필터 영역 */}
      <div className="details-filter-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field-group">
            <label className="field-label">제품군</label>
            <select className="input-x" value={group} onChange={e => setGroup(e.target.value)}>
              {PRODUCT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">관리주기</label>
            <select className="input-x" value={mgmt} onChange={e => setMgmt(e.target.value)}>
              {MGMT_CYCLE.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">약정</label>
            <select className="input-x" value={contractFilter} onChange={e => setContractFilter(e.target.value)}>
              {CONTRACT_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">최소 렌탈료</label>
            <input className="input-x" type="number" placeholder="최소" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">최대 렌탈료</label>
            <input className="input-x" type="number" placeholder="최대" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
          </div>
          <div className="field-group" style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label">키워드</label>
            <input className="input-x" placeholder="상품명 또는 모델명" value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">브랜드</label>
            <select className="input-x" value={brand} onChange={e => setBrand(e.target.value)}>
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost-x" onClick={resetFilters} style={{ padding: '8px 14px', fontSize: 13 }}>전체 초기화</button>
            <button className="btn btn-primary-x" onClick={() => {}} style={{ padding: '8px 14px', fontSize: 13 }}>필터 적용</button>
            <button className="btn btn-ghost-x" onClick={() => setHeaderFilterReset(v => v + 1)} style={{ padding: '8px 14px', fontSize: 13 }}>헤더필터 초기화</button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="table-scroll" style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1400 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['제품군','브랜드','상품명','모델명','규정',
                '3년 관리','3년 렌탈료','3년 지원금',
                '4년 관리','4년 렌탈료','4년 지원금',
                '5년 관리','5년 렌탈료','5년 지원금',
                '6년 관리','6년 렌탈료','6년 지원금',
                '7년 관리','7년 렌탈료','7년 지원금',
                '9년 관리','9년 렌탈료','9년 지원금'
              ].map((col, idx) => (
                <th key={col} style={{ padding: '10px 10px', borderBottom: '2px solid #e5e7eb', textAlign: idx < 5 ? 'left' : 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={23} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>비교할 제품이 없습니다.</td></tr>
            ) : (
              list.map((p, idx) => {
                const matrix = p.pricing_matrix || []
                return (
                  <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 10px' }}>{p.category || '-'}</td>
                    <td style={{ padding: '10px 10px' }}>{p.brand || '-'}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700 }}>{p.name || '-'}</td>
                    <td style={{ padding: '10px 10px', color: '#6b7280' }}>{p.model_code || '-'}</td>
                    <td style={{ padding: '10px 10px' }}>{p.rule_raw || '-'}</td>
                    {[3,4,5,6,7,9].map(year => (
                      <>
                        <td key={`mgmt-${year}`} style={{ padding: '10px 10px', textAlign: 'center' }}>{matrixRow(matrix, `${year}년`, 'mgmt')}</td>
                        <td key={`fee-${year}`} style={{ padding: '10px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{matrixRow(matrix, `${year}년`, 'fee')}</td>
                        <td key={`support-${year}`} style={{ padding: '10px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{matrixRow(matrix, `${year}년`, 'support')}</td>
                      </>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
