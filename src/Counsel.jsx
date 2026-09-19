/* ============================================================
   상담 (Counsel) 페이지
   - allnup.com 상담 기능 분석 결과 재구현
   - 상품 DB에서 실제 검색 → 상품 목록 → 상세 모달 → 접수 버튼
   - allnup에서 확인한 UI/UX 흐름을 복제하되
     기존 프로젝트의 디자인 시스템(catalog.css)을 유지
   ============================================================ */
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { img } from './lib/imageUrl'
import './catalog.css'
import AllRentalLogo from './components/AllRentalLogo'

const CATEGORIES = ['전체', '정수기', '공기청정기', '비데', '매트리스', '안마의자']
const BRANDS = ['전체', '코웨이', '청호나이스', '쿠쿠', 'SK매직', '현대큐밍', 'LG', '웰스', '세스코']
const CONTRACTS = ['전체', '신규', '보상', '신규/후결합', '보상/후결합', '신규/동시구매', '보상/동시구매']
const MGMT_TYPES = ['전체', '방문관리', '셀프관리', '자가관리']
const YEARS = ['전체', '3년', '4년', '5년', '6년', '7년', '9년', '10년']

const NO_IMG = '/assets/goods_image/no_image.jpg'
const won = (n) => (n ? Number(n).toLocaleString('ko-KR') : '0')

/* 상품명/모델명에서 브랜드 추출 */
function extractBrand(p = {}) {
  const b = p.brand || ''
  if (BRANDS.includes(b)) return b
  for (const x of BRANDS) if (x !== '전체' && (p.name || '').includes(x)) return x
  return b || '기타'
}

/* 가격 파싱 */
function parsePrice(s) {
  return parseInt(String(s || '0').replace(/[^0-9]/g, ''), 10) || 0
}

/* 대표 렌탈료 (신규/5년 우선) */
function representativeFee(matrix = []) {
  if (!matrix || !matrix.length) return 0
  const pick = matrix.find(r => r.contract === '신규' && r.years === '5년')
  return pick ? (pick.monthly_fee || 0) : (matrix[0]?.monthly_fee || 0)
}

/* ======================== 카드 썸네일 ======================== */
function CardSlideshow({ images, alt, active }) {
  const list = images && images.length ? images.slice(0, 6) : [NO_IMG]
  const [idx, setIdx] = useState(0)
  const [hover, setHover] = useState(false)
  useEffect(() => {
    if (list.length < 2) return
    const delay = hover || active ? 900 : 1800
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), delay)
    return () => clearInterval(t)
  }, [list.length, hover, active])
  return (
    <div
      className="pcard-thumb"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {list.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={`${alt} ${i + 1}`}
          className={i === idx ? 'on' : ''}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          onError={(e) => { e.currentTarget.src = NO_IMG }}
        />
      ))}
      {list.length > 1 && (
        <div className="thumb-dots">
          {list.map((_, i) => <i key={i} className={i === idx ? 'on' : ''} />)}
        </div>
      )}
    </div>
  )
}

/* ======================== 상담 상세 모달 ======================== */
function CounselDetailModal({ p, onClose, onReceive, commissionOn, customerName, customerContact, onCustomerChange }) {
  if (!p) return null
  const matrix = p.pricing_matrix || []
  const [rule, setRule] = useState('')
  const [contractType, setContractType] = useState('')
  const [management, setManagement] = useState('')
  const [managementCycle, setManagementCycle] = useState('')
  const [years, setYears] = useState('')
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState(p.colors?.[0] || '')
  const options = matrix.map((option, index) => ({ ...option, _idx: index }))
  const filteredOptions = options.filter((option) =>
    (!rule || (option.rule_raw || option.contract || '') === rule) &&
    (!contractType || option.contract === contractType) &&
    (!management || (option.mgmt || '') === management) &&
    (!managementCycle || (option.mgmt_cycle || '') === managementCycle) &&
    (!years || option.years === years)
  )
  const selectedOption = filteredOptions.find((option) => option._idx === selectedOptionIndex) || filteredOptions[0] || options[0] || {}
  const optionValues = (field, fallback = '') => [...new Set(options.map((option) => option[field] || fallback).filter(Boolean))]
  const rep = selectedOption
  const effMonthly = rep.monthly_fee || p.min_monthly_fee || 0

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card fullscreen" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topbar">
          <button className="modal-back" onClick={onClose}>← 뒤로</button>
          <div className="modal-topbar-title">{p.brand} · {p.name} · {p.model_code}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
            {/* 좌: 이미지 + 기본 정보 */}
            <div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {p.images && p.images.length > 0 ? p.images.map((im, i) => (
                  <img
                    key={i}
                    src={img(im)}
                    alt={`${p.name} ${i + 1}`}
                    style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                )) : <img src={img('/assets/goods_detail/no_image.jpg')} alt={p.name} style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8 }} />}
              </div>
            </div>

            {/* 메타 정보 */}
            <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div><b style={{ color: '#6b7280' }}>브랜드</b> {p.brand}</div>
                <div><b style={{ color: '#6b7280' }}>상품명</b> {p.name}</div>
                <div><b style={{ color: '#6b7280' }}>모델명</b> {p.model_code || '-'}</div>
                <div><b style={{ color: '#6b7280' }}>제품종류</b> {p.category || '-'}</div>
                {selectedColor && (
                  <div><b style={{ color: '#6b7280' }}>선택 색상</b> {selectedColor}</div>
                )}
              </div>

              {/* 가격 카드 */}
              <div style={{
                background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 12,
                padding: '14px 16px', marginTop: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                  <span>월 렌탈료</span>
                  <span>수수료 (사은)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#1d4ed8' }}>{won(effMonthly)}<small style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>원</small></span>
                  {commissionOn && rep.commission && (
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#ea580c' }}>{won(rep.commission)}<small style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>원</small></span>
                  )}
                </div>
              </div>
            </div>

            {/* 접수용 고객정보 입력 */}
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>접수 고객 정보</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>고객명 *</label>
                  <input className="input-x" value={customerName || ''} onChange={onCustomerChange} name="customerName" placeholder="고객명" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>연락처 *</label>
                  <input className="input-x" value={customerContact || ''} onChange={onCustomerChange} name="customerContact" placeholder="010-0000-0000" />
                </div>
              </div>
            </div>

            {/* 렌탈 조건 · 색상 선택 */}
            {matrix.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800 }}>렌탈 조건 선택</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
                  <select className="input-x" value={rule} onChange={(e) => setRule(e.target.value)} aria-label="규정 선택">
                    <option value="">규정 전체</option>
                    {optionValues('rule_raw', '').map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <select className="input-x" value={contractType} onChange={(e) => setContractType(e.target.value)} aria-label="계약 선택">
                    <option value="">계약 전체</option>
                    {optionValues('contract').map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <select className="input-x" value={management} onChange={(e) => setManagement(e.target.value)} aria-label="관리 선택">
                    <option value="">관리 전체</option>
                    {optionValues('mgmt').map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <select className="input-x" value={managementCycle} onChange={(e) => setManagementCycle(e.target.value)} aria-label="관리주기 선택">
                    <option value="">관리주기 전체</option>
                    {optionValues('mgmt_cycle').map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <select className="input-x" value={years} onChange={(e) => setYears(e.target.value)} aria-label="약정기간 선택">
                    <option value="">약정기간 전체</option>
                    {optionValues('years').map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  {p.colors?.length > 0 && (
                    <select className="input-x" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} aria-label="색상 선택">
                      {p.colors.map((color) => <option key={color} value={color}>{color}</option>)}
                    </select>
                  )}
                </div>
                <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 12 }}>원하는 조건의 행을 눌러 선택한 뒤 접수해 주세요.</p>
                <div style={{ overflowX: 'auto' }}>
                  <table className="matrix-table" style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th>선택</th><th>규정</th><th>계약</th><th>관리</th>
                        <th>관리주기</th><th>약정기간</th><th>월 렌탈료</th>
                        {commissionOn && <th>수수료</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOptions.map((r) => (
                        <tr key={r._idx} onClick={() => setSelectedOptionIndex(r._idx)} style={{ cursor: 'pointer', background: selectedOption._idx === r._idx ? '#eff6ff' : undefined }}>
                          <td><input type="radio" checked={selectedOption._idx === r._idx} onChange={() => setSelectedOptionIndex(r._idx)} aria-label={`${r.years || ''} ${r.contract || ''} 선택`} /></td>
                          <td>{r.rule_raw || r.contract || '-'}</td>
                          <td>{r.contract || '-'}</td>
                          <td>{r.mgmt || '-'}</td>
                          <td>{r.mgmt_cycle || '-'}</td>
                          <td>{r.years || '-'}</td>
                          <td><b>{won(r.monthly_fee)}원</b></td>
                          {commissionOn && <td>{r.commission ? won(r.commission) + '원' : '-'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 접수 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
              <button className="btn btn-ghost-x" onClick={onClose} style={{ flex: 1, maxWidth: 120 }}>취소</button>
              <button
                className="btn btn-primary-x"
                style={{ flex: 1, maxWidth: 200 }}
                onClick={() => onReceive(p, { selectedOption, color: selectedColor })}
              >접수</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ======================== 메인 상담 페이지 ======================== */
export default function Counsel() {
  const navigate = useNavigate()
  const [all, setAll] = useState(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('전체')
  const [brand, setBrand] = useState('전체')
  const [contract, setContract] = useState('전체')
  const [mgmt, setMgmt] = useState('전체')
  const [year, setYear] = useState('전체')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sort, setSort] = useState('sales_desc')
  const [sel, setSel] = useState(null)
  const [commissionOn, setCommissionOn] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')

  const onCustomerChange = (e) => {
    const { name, value } = e.target
    if (name === 'customerName') setCustomerName(value)
    if (name === 'customerContact') setCustomerContact(value)
  }

  const handleReceive = (product, selection = {}) => {
    const payload = {
      product,
      selectedOption: selection.selectedOption || null,
      color: selection.color || '',
      customerName: customerName || '',
      customerContact: customerContact || '',
    }
    sessionStorage.setItem('allrental_selected_product', JSON.stringify(payload))
    navigate('/admin/reception')
  }

  useEffect(() => {
    fetch('/data/products.json')
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((data) => setAll(data))
      .catch((e) => setErr(String(e)))
  }, [])

  const list = useMemo(() => {
    if (!all) return []
    const kw = q.trim().toLowerCase()
    const filtered = all.filter((p) => {
      // 카테고리
      if (cat !== '전체' && p.category !== cat) return false
      // 브랜드
      const b = extractBrand(p)
      if (brand !== '전체' && b !== brand) return false
      // 계약
      if (contract !== '전체' && !(p.pricing_matrix || []).some(r => r.contract === contract)) return false
      // 관리
      if (mgmt !== '전체' && !(p.pricing_matrix || []).some(r => (r.mgmt || '') === mgmt)) return false
      // 약정기간
      if (year !== '전체' && !(p.pricing_matrix || []).some(r => r.years === year)) return false
      // 가격 범위
      const price = representativeFee(p.pricing_matrix) || parsePrice(p.min_monthly_fee)
      if (priceMin && price < parseInt(priceMin, 10)) return false
      if (priceMax && price > parseInt(priceMax, 10)) return false
      // 키워드 (상품명, 모델명, 브랜드, 태그)
      if (kw) {
        const hay = `${p.name || ''} ${p.model_code || ''} ${p.brand || ''} ${(p.tags || []).join(' ')}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
    return [...filtered].sort((a, b) => {
      if (sort === 'price_asc') return representativeFee(a.pricing_matrix) - representativeFee(b.pricing_matrix)
      if (sort === 'price_desc') return representativeFee(b.pricing_matrix) - representativeFee(a.pricing_matrix)
      return (b.max_commission || 0) - (a.max_commission || 0)
    })
  }, [all, q, cat, brand, contract, mgmt, year, priceMin, priceMax, sort])

  const resetFilters = () => {
    setCat('전체'); setBrand('전체'); setContract('전체')
    setMgmt('전체'); setYear('전체'); setPriceMin(''); setPriceMax('')
  }

  if (err) {
    return (
      <div className="splash"><div className="box">
        <div className="logo">!</div>
        <p>데이터 로드 실패: {err}</p>
      </div></div>
    )
  }
  if (!all) {
    return (
      <div className="splash"><div className="box splash-anim">
        <AllRentalLogo />
        <div className="splash-bar"><span /></div>
        <p>상품을 검색하는 중...</p>
      </div></div>
    )
  }

  return (
    <div className="cat-root">
      <div className="cat-header">
        <h1>상담</h1>
        <div className="count">{list.length}개 상품</div>
      </div>

      <div className="cat-toolbar">
        <input
          className="cat-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="상품명 · 모델명 · 브랜드 · 태그 검색 (예: 아이콘3, CHP-7220N)"
        />
        <select className="cat-sort" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="카테고리">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="cat-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="상품 정렬">
          <option value="sales_desc">판매량 많은 순</option>
          <option value="price_asc">렌탈료 낮은 순</option>
          <option value="price_desc">렌탈료 높은 순</option>
        </select>
      </div>

      {/* 스마트 필터 칩 */}
      <div className="smart-filter-box" style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div className="smart-filter-title">🔍 검색 필터</div>
        <div className="chip-row">
          <span className="filter-label">브랜드</span>
          {BRANDS.map((b) => (
            <button key={b} className={`chip ${brand === b ? 'active' : ''}`} onClick={() => setBrand(b)}>{b}</button>
          ))}
        </div>
        <div className="chip-row">
          <span className="filter-label">계약</span>
          {CONTRACTS.map((c) => (
            <button key={c} className={`chip ${contract === c ? 'active' : ''}`} onClick={() => setContract(c)}>{c}</button>
          ))}
        </div>
        <div className="chip-row">
          <span className="filter-label">관리</span>
          {MGMT_TYPES.map((m) => (
            <button key={m} className={`chip ${mgmt === m ? 'active' : ''}`} onClick={() => setMgmt(m)}>{m}</button>
          ))}
        </div>
        <div className="chip-row">
          <span className="filter-label">약정기간</span>
          {YEARS.map((y) => (
            <button key={y} className={`chip ${year === y ? 'active' : ''}`} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
        {/* 가격 범위 */}
        <div className="chip-row">
          <span className="filter-label">렌탈료</span>
          <input
            type="number" placeholder="최소" value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            style={{ width: 100, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
          />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>~</span>
          <input
            type="number" placeholder="최대" value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            style={{ width: 100, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
          />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>원</span>
        </div>
        <button className="btn-ghost-x" onClick={resetFilters} style={{ fontSize: 12, padding: '6px 12px' }}>필터 초기화</button>
      </div>

      {/* 상품 목록 */}
      {list.length === 0 ? (
        <div className="empty-state">조건에 맞는 상품이 없습니다.</div>
      ) : (
        <>
          <div className="cat-grid">
            {list.map((p) => (
              <button
                key={p.id}
                className={`pcard ${sel?.id === p.id ? 'selected' : ''}`}
                onClick={() => setSel(p)}
              >
                <CardSlideshow images={p.images} alt={p.name} active={sel?.id === p.id} />
                <div className="pcard-body">
                  <div className="pcard-brand">{p.brand}</div>
                  <div className="pcard-name">{p.name}</div>
                  <div className="pcard-model">{p.model_code || ' '}</div>
                  <div className="pcard-fee is-fee">
                    <span className="tag">월</span>
                    <span className="val">{won(representativeFee(p.pricing_matrix))}</span>
                    <span className="won">원~</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* 상세 모달 */}
          {sel && (
            <CounselDetailModal
              p={sel}
              commissionOn={commissionOn}
              onClose={() => setSel(null)}
              onReceive={handleReceive}
              customerName={customerName}
              customerContact={customerContact}
              onCustomerChange={onCustomerChange}
            />
          )}
        </>
      )}
    </div>
  )
}
