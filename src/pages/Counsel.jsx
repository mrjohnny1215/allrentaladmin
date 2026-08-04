import React, { useEffect, useMemo, useRef, useState } from 'react'

// ── 원본 api_data.php?view=counsel_ws 구조: [헤더행, ...데이터행] (2차원 배열) ──
// 컬럼 인덱스 (원본 counsel.php 기준)
// 0 상품명 / 1 모델명 / 2 색상 / 3 용량 / 4 사이즈 / 5 규정
// 관리주기 인덱스: [7,11,15,19,23,31,35] = 3/4/5/6/7/8/9년 관리주기
// 해당 연차 렌탈료: [8,12,16,20,24,32,36], 수수료: [9,13,17,21,25,33,37]
// 26 상세페이지 / 27 당월주요프로모션 / 28 브랜드 / 29 제품군 / 38 프로모션 / 39 태그 / 40 셀링포인트 / 41 공통프로모션

const MGMT_IDX = [7, 11, 15, 19, 23, 31, 35]   // 관리주기(연차별)
const RENTAL_IDX = [8, 12, 16, 20, 24, 32, 36] // 렌탈료
const FEE_IDX = [9, 13, 17, 21, 25, 33, 37]     // 수수료
const YEARS = [3, 4, 5, 6, 7, 8, 9]

const GROUPS = ['전체', '얼음냉온', '얼음냉정', '냉온', '냉정', '정수', '청정기', '비데', '침대']
const PRODUCT_TYPES = ['전체', '데스크', '스탠드', '지하수', '빌트인', '매트리스', '프레임']
const RULES_RAW = ['신규', '보상', '결합', '특가', '신규/후결합', '보상/후결합', '신규/동시구매', '보상/동시구매', 'PKG', '단체']
const CARD_DISCOUNTS = Array.from({ length: 16 }, (_, i) => i * 1000) // 0~15000

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[\s-]/g, '')
}

function toRows(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return { header: [], rows: [] }
  const header = arr[0]
  const rows = arr.slice(1).map(r => {
    const o = {}
    header.forEach((h, i) => { o[h] = r[i] })
    return o
  })
  return { header, rows }
}

// 상품군 매핑 (원본 분류 버튼 → 제품군 값)
function groupMatch(group, rowGroup) {
  if (group === '전체') return true
  return rowGroup === group
}

export default function Counsel() {
  const [raw, setRaw] = useState({ header: [], rows: [] })
  const [loading, setLoading] = useState(true)

  // 필터 상태
  const [brand, setBrand] = useState('')
  const [rule, setRule] = useState('')
  const [mgmt, setMgmt] = useState('')
  const [keyword, setKeyword] = useState('')
  const [group, setGroup] = useState('전체')
  const [ptype, setPtype] = useState('전체')
  const [sort, setSort] = useState('') // rental_asc|rental_desc|fee_asc|fee_desc
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  // 선택된 검색결과 (최대 3개)
  const [selected, setSelected] = useState([]) // [{row, header}]
  const [activeTab, setActiveTab] = useState('consult') // consult|image|rental|card
  const [cardDiscount, setCardDiscount] = useState(0)

  const { header, rows } = raw

  useEffect(() => {
    fetch('./data/counsel_ws.json')
      .then(r => r.json())
      .then(arr => { setRaw(toRows(arr)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // 상호연동 드롭다운 옵션 계산
  const { brands, rules, mgmts } = useMemo(() => {
    const bSet = new Set(), rSet = new Set(), mSet = new Set()
    const bKey = normalize(brand), rKey = normalize(rule), mKey = normalize(mgmt)
    rows.forEach(r => {
      const br = r['브랜드'] || ''
      const ru = r['규정'] || ''
      const mg = MGMT_IDX.map(i => (r[header[i]] || '').split(',')[0]?.trim()).filter(Boolean)
      const brK = normalize(br), ruK = normalize(ru), mgK = mg.map(normalize)
      const brandMatch = (!rKey || ruK === rKey) && (!mKey || mgK.includes(mKey))
      const ruleMatch = (!bKey || brK === bKey) && (!mKey || mgK.includes(mKey))
      const mgmtMatch = (!bKey || brK === bKey) && (!rKey || ruK === rKey)
      if (brandMatch && br) bSet.add(br)
      if (ruleMatch && ru) rSet.add(ru)
      if (mgmtMatch) mg.forEach(v => mSet.add(v))
    })
    return {
      brands: Array.from(bSet).sort(),
      rules: Array.from(rSet).sort(),
      mgmts: Array.from(mSet).sort(),
    }
  }, [rows, brand, rule, mgmt, header])

  // 검색 필터 적용
  const results = useMemo(() => {
    const kw = normalize(keyword)
    let nameKw = '', modelKw = ''
    if (keyword.includes('//')) {
      const p = keyword.split('//')
      nameKw = normalize(p[0] || '')
      modelKw = normalize(p[1] || '')
    }
    const bKey = normalize(brand), rKey = normalize(rule), mKey = normalize(mgmt)
    const out = rows.filter(r => {
      const name = normalize(r['상품명'])
      const model = normalize(r['모델명'])
      const ru = normalize(r['규정'])
      const br = normalize(r['브랜드'])
      const grp = r['제품군'] || ''
      const mg = MGMT_IDX.map(i => normalize(r[header[i]] || '').split(',')[0])
      // 키워드
      let kwOk
      if (nameKw || modelKw) kwOk = name.includes(nameKw) && model.includes(modelKw)
      else kwOk = !kw || name.includes(kw) || model.includes(kw)
      if (!kwOk) return false
      if (bKey && br !== bKey) return false
      if (rKey && ru !== rKey) return false
      if (mKey && !mg.includes(mKey)) return false
      if (!groupMatch(group, grp)) return false
      if (ptype !== '전체' && grp !== ptype) return false
      // 가격 범위 (3년 렌탈료 기준)
      const price = parseInt(String(r['3년렌탈료'] || '0').replace(/[^0-9]/g, '')) || 0
      if (priceMin && price < parseInt(priceMin) * 10000) return false
      if (priceMax && price > parseInt(priceMax) * 10000) return false
      return true
    })
    // 정렬
    if (sort) {
      out.sort((a, b) => {
        const ra = parseInt(String(a['3년렌탈료'] || '0').replace(/[^0-9]/g, '')) || 0
        const rb = parseInt(String(b['3년렌탈료'] || '0').replace(/[^0-9]/g, '')) || 0
        const fa = parseInt(String(a['3년수수료'] || '0').replace(/[^0-9]/g, '')) || 0
        const fb = parseInt(String(b['3년수수료'] || '0').replace(/[^0-9]/g, '')) || 0
        if (sort === 'rental_asc') return ra - rb
        if (sort === 'rental_desc') return rb - ra
        if (sort === 'fee_asc') return fa - fb
        if (sort === 'fee_desc') return fb - fa
        return 0
      })
    }
    return out
  }, [rows, brand, rule, mgmt, keyword, group, ptype, sort, priceMin, priceMax, header])

  // 선택 토글
  function toggleSelect(r) {
    setSelected(prev => {
      const idx = prev.findIndex(p => p['모델명'] === r['모델명'] && p['상품명'] === r['상품명'])
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      if (prev.length >= 3) return [...prev.slice(1), r]
      return [...prev, r]
    })
  }

  function resetAll() {
    setBrand(''); setRule(''); setMgmt(''); setKeyword('')
    setGroup('전체'); setPtype('전체'); setSort(''); setPriceMin(''); setPriceMax('')
    setSelected([])
  }

  return (
    <div style={{ minHeight: '70vh' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ── 좌측: 검색 + 선택 ── */}
        <section style={{ ...cardStyle, flex: '1 1 360px', minWidth: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h5 style={{ fontWeight: 700, margin: 0 }}>검색</h5>
          </div>

          <Label>브랜드</Label>
          <Select value={brand} onChange={setBrand} options={['', ...brands]} placeholder="선택 (필수 아님)" />

          <Label>규정</Label>
          <Select value={rule} onChange={setRule} options={['', ...rules]} placeholder="선택 (필수 아님)" />

          <Label>관리주기</Label>
          <Select value={mgmt} onChange={setMgmt} options={['', ...mgmts]} placeholder="선택 (필수 아님)" />

          <Label>키워드 (상품명//모델명)</Label>
          <input style={inputStyle} placeholder="예: 얼음냉온 또는 코웨이//WI-" value={keyword}
            onChange={e => setKeyword(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary-x" style={{ flex: 1 }} onClick={() => setBrand(b => b)}>검색</button>
            <button className="btn-ghost-x" onClick={resetAll}>초기화</button>
          </div>

          {/* 선택 패널 */}
          <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 14 }}>
            <h6 style={{ fontWeight: 700, margin: '0 0 10px' }}>선택 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({selected.length}/3)</span></h6>
            {[0, 1, 2].map(i => {
              const r = selected[i]
              return (
                <div key={i} style={{ border: '1px solid #e3e8f0', borderRadius: 10, padding: 10, marginBottom: 8, background: r ? '#f5f9ff' : '#fafafa' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                    {r ? `${r['상품명']} (${r['모델명']})` : '검색결과 ' + (i + 1)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <MiniBtn disabled={!r}>제품비교</MiniBtn>
                    <MiniBtn disabled={!r}>상세페이지</MiniBtn>
                    <MiniBtn disabled={!r}>견적서</MiniBtn>
                    <MiniBtn disabled={!r}>접수</MiniBtn>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 중앙: 렌탈료 정보 ── */}
        <section style={{ ...cardStyle, flex: '2 1 480px', minWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <h5 style={{ fontWeight: 700, margin: 0, marginRight: 8 }}>렌탈료 정보</h5>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>총 {results.length}개</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {[
                ['consult', '상담'], ['image', '이미지 복사'], ['rental', '렌탈료 복사'], ['card', '제휴카드'],
              ].map(([k, label]) => (
                <button key={k}
                  className="btn-ghost-x"
                  style={{
                    padding: '0.4rem 0.7rem', fontSize: '0.8rem',
                    background: activeTab === k ? 'var(--cobalt)' : '#eef2f7',
                    color: activeTab === k ? '#fff' : 'var(--text)',
                  }}
                  onClick={() => setActiveTab(k)}>{label}</button>
              ))}
            </div>
          </div>

          {/* 카드할인 선택 (제휴카드 탭) */}
          {activeTab === 'card' && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem' }}>카드할인</span>
              <select style={inputStyle} value={cardDiscount} onChange={e => setCardDiscount(Number(e.target.value))}>
                {CARD_DISCOUNTS.map(v => <option key={v} value={v}>{v.toLocaleString()}</option>)}
              </select>
            </div>
          )}

          {loading ? <p>데이터 로딩 중...</p> : (
            <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: '#fff', position: 'sticky', top: 0 }}>
                    <th style={thStyle}>선택</th>
                    <th style={thStyle}>상품명</th>
                    <th style={thStyle}>모델명</th>
                    <th style={thStyle}>브랜드</th>
                    <th style={thStyle}>제품군</th>
                    <th style={thStyle}>규정</th>
                    <th style={thStyle}>3년 렌탈료</th>
                    <th style={thStyle}>5년 렌탈료</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 100).map((r, i) => {
                    const isSel = selected.some(p => p['모델명'] === r['모델명'] && p['상품명'] === r['상품명'])
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #eee', background: isSel ? '#eef3ff' : 'transparent' }}>
                        <td style={tdStyle}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(r)} />
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{r['상품명']}</td>
                        <td style={tdStyle}>{r['모델명']}</td>
                        <td style={tdStyle}>{r['브랜드']}</td>
                        <td style={tdStyle}>{r['제품군']}</td>
                        <td style={tdStyle}>{r['규정']}</td>
                        <td style={tdStyle}>{applyDiscount(r['3년렌탈료'], cardDiscount)}</td>
                        <td style={tdStyle}>{applyDiscount(r['5년렌탈료'], cardDiscount)}</td>
                      </tr>
                    )
                  })}
                  {results.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>검색 결과가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 우측: 간편검색 ── */}
        <section style={{ ...cardStyle, flex: '1 1 300px', minWidth: 280 }}>
          <h5 style={{ fontWeight: 700, margin: '0 0 12px' }}>간편검색</h5>
          <ChipGroup title="분류" options={GROUPS} selected={group} onSelect={setGroup} />
          <ChipGroup title="브랜드" options={brands.length ? ['전체', ...brands] : ['전체']} selected={brand || '전체'} onSelect={v => setBrand(v === '전체' ? '' : v)} />
          <ChipGroup title="제품타입" options={PRODUCT_TYPES} selected={ptype} onSelect={setPtype} />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '10px 0 4px' }}>정렬</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[['rental_asc', '렌탈료낮'], ['rental_desc', '렌탈료높'], ['fee_asc', '수수료낮'], ['fee_desc', '수수료높']].map(([k, l]) => (
              <button key={k} className="btn-ghost-x" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', background: sort === k ? 'var(--cobalt)' : '#eef2f7', color: sort === k ? '#fff' : 'var(--text)' }} onClick={() => setSort(sort === k ? '' : k)}>{l}</button>
            ))}
          </div>
          <Label>렌탈료 범위 (만원)</Label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={inputStyle} placeholder="최소" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
            <input style={inputStyle} placeholder="최대" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-ghost-x" style={{ flex: 1 }} onClick={resetAll}>초기화</button>
            <button className="btn-primary-x" style={{ flex: 1 }} onClick={() => setBrand(b => b)}>검색하기</button>
          </div>
        </section>
      </div>
    </div>
  )
}

// 카드할인 적용
function applyDiscount(val, discount) {
  if (!val || !discount) return val || '-'
  const n = parseInt(String(val).replace(/[^0-9]/g, '')) || 0
  const d = n - discount
  return (d > 0 ? d.toLocaleString() : 0) + '원'
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.75rem 0 0.35rem' }}>{children}</label>
}
function Select({ value, onChange, options, placeholder }) {
  return (
    <select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.filter(o => o !== '').map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
function MiniBtn({ children, disabled }) {
  return <button disabled={disabled} className="btn-ghost-x" style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', opacity: disabled ? 0.4 : 1 }}>{children}</button>
}
function ChipGroup({ title, options, selected, onSelect }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => (
          <button key={o} className="btn-ghost-x" style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem', background: selected === o ? 'var(--cobalt)' : '#eef2f7', color: selected === o ? '#fff' : 'var(--text)' }} onClick={() => onSelect(o)}>{o}</button>
        ))}
      </div>
    </div>
  )
}

const cardStyle = {
  background: '#fff',
  borderRadius: 'var(--radius)',
  padding: '1.25rem',
  boxShadow: 'var(--shadow)',
}
const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--input-border)', background: 'var(--input-bg)' }
const thStyle = { padding: '0.6rem', textAlign: 'left', whiteSpace: 'nowrap' }
const tdStyle = { padding: '0.5rem 0.6rem', whiteSpace: 'nowrap' }
