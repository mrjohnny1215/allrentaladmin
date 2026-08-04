import React, { useEffect, useMemo, useState } from 'react'

// 원본 api_data.php?view=counsel_ws 는 2차원 배열: [헤더행, ...데이터행]
// 컬럼 인덱스는 src에서 추출한 69개 컬럼과 동일
const COL = {
  name: 0, model: 1, color: 2, capacity: 3, size: 4, terms: 5,
  b3: 6, mc3: 7, r3: 8, f3: 9,
  b4: 10, mc4: 11, r4: 12, f4: 13,
  b5: 14, mc5: 15, r5: 16, f5: 17,
  b6: 18, mc6: 19, r6: 20, f6: 21,
  b7: 22, mc7: 23, r7: 24, f7: 25,
  detail: 26, promoMonth: 27, brand: 28, group: 29,
  b8: 30, mc8: 31, r8: 32, f8: 33,
  b9: 34, mc9: 35, r9: 36, f9: 37,
  promo: 38, tag: 39, selling: 40, commonPromo: 41, updated: 42,
}

const BRANDS = ['코웨이', '청호', 'SK', '쿠쿠', '웰스', 'LG', '현대', '세스코']
const GROUPS = ['전체', '얼음냉온', '얼음냉정', '냉온', '냉정', '정수', '청정기', '비데', '침대']

function toRows(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return []
  const header = arr[0]
  return arr.slice(1).map(r => {
    const o = {}
    header.forEach((h, i) => { o[h] = r[i] })
    return o
  })
}

export default function Counsel() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [brand, setBrand] = useState('전체')
  const [group, setGroup] = useState('전체')
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    fetch('./data/counsel_ws.json')
      .then(r => r.json())
      .then(arr => { setData(toRows(arr)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (brand !== '전체' && r['브랜드'] !== brand) return false
      if (group !== '전체' && r['제품군'] !== group) return false
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase()
        const hay = (r['상품명'] || '') + ' ' + (r['모델명'] || '')
        if (!hay.toLowerCase().includes(k)) return false
      }
      return true
    })
  }, [data, brand, group, keyword])

  useEffect(() => { setResults(filtered.slice(0, 50)) }, [filtered])

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* 좌측: 검색 필터 */}
      <section style={panelStyle} className="counsel-left">
        <h5 style={{ fontWeight: 700, margin: '0 0 1rem' }}>검색</h5>
        <label style={labelStyle}>브랜드</label>
        <select style={inputStyle} value={brand} onChange={e => setBrand(e.target.value)}>
          <option>전체</option>
          {BRANDS.map(b => <option key={b}>{b}</option>)}
        </select>

        <label style={labelStyle}>제품군</label>
        <select style={inputStyle} value={group} onChange={e => setGroup(e.target.value)}>
          {GROUPS.map(g => <option key={g}>{g}</option>)}
        </select>

        <label style={labelStyle}>키워드</label>
        <input
          style={inputStyle}
          placeholder="상품명 또는 모델명 입력"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn-primary-x" style={{ flex: 1 }} onClick={() => setResults(filtered.slice(0, 50))}>검색</button>
          <button className="btn-ghost-x" onClick={() => { setBrand('전체'); setGroup('전체'); setKeyword('') }}>초기화</button>
        </div>
      </section>

      {/* 중앙: 결과 */}
      <section style={{ ...panelStyle, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h5 style={{ fontWeight: 700, margin: 0 }}>렌탈료 정보</h5>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            총 {filtered.length}개 / 표시 {results.length}개
          </span>
        </div>
        {loading ? (
          <p>데이터 로딩 중...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff' }}>
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
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>{r['상품명']}</td>
                    <td style={tdStyle}>{r['모델명']}</td>
                    <td style={tdStyle}>{r['브랜드']}</td>
                    <td style={tdStyle}>{r['제품군']}</td>
                    <td style={tdStyle}>{r['규정']}</td>
                    <td style={tdStyle}>{r['3년렌탈료'] || '-'}</td>
                    <td style={tdStyle}>{r['5년렌탈료'] || '-'}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>검색 결과가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 우측: 간편검색 (그룹/브랜드 빠른 버튼) */}
      <section style={{ ...panelStyle, width: 260, flexShrink: 0 }}>
        <h5 style={{ fontWeight: 700, margin: '0 0 1rem' }}>간편검색</h5>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>제품군</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {GROUPS.map(g => (
            <button key={g} className="btn-ghost-x" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', background: group === g ? 'var(--cobalt)' : '#e9ecef', color: group === g ? '#fff' : 'var(--text)' }} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>브랜드</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {BRANDS.map(b => (
            <button key={b} className="btn-ghost-x" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', background: brand === b ? 'var(--cobalt)' : '#e9ecef', color: brand === b ? '#fff' : 'var(--text)' }} onClick={() => setBrand(b)}>{b}</button>
          ))}
        </div>
      </section>
    </div>
  )
}

const panelStyle = {
  background: '#fff',
  borderRadius: 'var(--radius)',
  padding: '1.25rem',
  boxShadow: 'var(--shadow)',
  width: 300,
  flexShrink: 0,
}
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.75rem 0 0.35rem' }
const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--input-border)', background: 'var(--input-bg)' }
const thStyle = { padding: '0.6rem', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0 }
const tdStyle = { padding: '0.6rem', whiteSpace: 'nowrap' }
