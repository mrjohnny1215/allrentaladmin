import React, { useState, useEffect, useMemo } from 'react'
import './receipt.css'
import './settlement.css'

const MONTHS = Array.from({ length: 12 }, (_, i) => '' + String(i + 1).padStart(2, '0') + '월')

export default function SettlementManage() {
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [partner, setPartner] = useState('')
  const [owner, setOwner] = useState('')
  const [custName, setCustName] = useState('')
  const [startR, setStartR] = useState('')
  const [endR, setEndR] = useState('')
  const [startI, setStartI] = useState('')
  const [endI, setEndI] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 정산 API 우선, 실패 시 브라우저에 저장된 정산 데이터 사용
    let cancelled = false
    setLoading(true)
    fetch('/api/settlements')
      .then(r => r.ok ? r.json() : Promise.reject('no-api'))
      .then(data => { if (!cancelled) setList(Array.isArray(data) ? data : []) })
      .catch(() => {
        try {
          const raw = localStorage.getItem('allrental_settlements')
          if (!cancelled && raw) setList(JSON.parse(raw))
        } catch {}
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    return list.filter(item => {
      if (month && item.month !== month) return false
      if (partner && !(item.partner || '').includes(partner)) return false
      if (owner && !(item.owner || '').includes(owner)) return false
      if (custName && !((item.customerName || '') + (item.customerNo || '')).includes(custName)) return false
      if (startR && (item.receivedStart || item.receivedAt || '') < startR) return false
      if (endR && (item.receivedEnd || item.receivedAt || '') > endR) return false
      if (startI && (item.installStart || item.installedAt || '') < startI) return false
      if (endI && (item.installEnd || item.installedAt || '') > endI) return false
      return true
    })
  }, [list, month, partner, owner, custName, startR, endR, startI, endI])

  const summary = useMemo(() => {
    const count = filtered.length
    const fee = filtered.reduce((s, r) => s + (Number(r.fee) || 0), 0)
    const vat = filtered.reduce((s, r) => s + (Number(r.vat) || 0), 0)
    const tax = filtered.reduce((s, r) => s + (Number(r.tax) || 0), 0)
    const total = filtered.reduce((s, r) => s + (Number(r.total) || Number(r.fee || 0) + Number(r.vat || 0) + Number(r.tax || 0)), 0)
    return { count, fee, vat, tax, total }
  }, [filtered])

  const resetSearch = () => {
    setPartner(''); setOwner(''); setCustName('')
    setStartR(''); setEndR(''); setStartI(''); setEndI('')
  }

  const csvDownload = () => {
    if (!filtered.length) return
    const header = 'No,발행자,진행상황,정산월,담당자,접수일,설치일,고객명,고객번호,브랜드,제품명,특이사항,수수료,입금일자\n'
    const rows = filtered.map((r, i) => [
      i + 1, r.publisher || '', r.status || '', r.month || '', r.owner || '',
      r.receivedAt || r.receivedStart || '', r.installedAt || r.installEnd || '',
      r.customerName || '', r.customerNo || '', r.brand || '', r.productName || '',
      r.memo || '', r.fee || 0, r.depositAt || ''
    ].join(','))
    const csv = '\uFEFF' + header + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `settlement_${month || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="settlement-root allrental-settlement">
      <section className="settlement-page-head">
        <div>
          <span className="settlement-kicker">ALLRENTAL ADMIN</span>
          <h2>정산 관리</h2>
          <p>접수 건별 수수료와 입금 현황을 한 곳에서 관리하세요.</p>
        </div>
        <div className="settlement-month-badge">{month || '전체'} 정산</div>
      </section>

      {/* 검색 영역 */}
      <div className="settlement-search-card">
        <div className="settlement-card-title">필터 검색</div>
        <div className="settlement-filter-grid">
          <div className="field-group">
            <label className="field-label">정산월</label>
            <select className="input-x" value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">전체</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">브랜드</label>
            <input className="input-x" placeholder="브랜드" value={partner} onChange={e => setPartner(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">고객명/연락처</label>
            <input className="input-x" placeholder="고객명 또는 연락처" value={custName} onChange={e => setCustName(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">접수일자 시작</label>
            <input className="input-x" type="date" value={startR} onChange={e => setStartR(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">접수일자 종료</label>
            <input className="input-x" type="date" value={endR} onChange={e => setEndR(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">설치일자 시작</label>
            <input className="input-x" type="date" value={startI} onChange={e => setStartI(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">설치일자 종료</label>
            <input className="input-x" type="date" value={endI} onChange={e => setEndI(e.target.value)} />
          </div>
        </div>
        <div className="settlement-actions">
          <button className="settlement-reset" onClick={resetSearch}>초기화</button>
          <button className="settlement-search" onClick={() => {}}>검색</button>
          <button className="settlement-export" onClick={csvDownload}>CSV 다운로드</button>
        </div>
      </div>

      {/* 합계 카드 */}
      <div className="settlement-summary">
        <div className="settlement-summary-title">현재 필터 기준</div>
        <div className="settlement-summary-grid">
            {[
              ['건수', summary.count],
              ['수수료', summary.fee.toLocaleString()],
              ['부가세', summary.vat.toLocaleString()],
              ['원천세', summary.tax.toLocaleString()],
              ['합계', summary.total.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="settlement-stat">
                <div>{label}</div>
                <strong>{value}</strong>
              </div>
            ))}
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>불러오는 중...</div>
      ) : (
        <div className="settlement-table-wrap">
          <table className="settlement-table">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', width: 40 }}><input type="checkbox" /></th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>No</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>발행자</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>진행상황</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>정산월</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>담당자</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>접수일</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>설치일</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>고객명</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>고객번호</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>브랜드</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>제품명</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>특이사항</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'right' }}>수수료</th>
                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>입금일자</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={15} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>정산 내역이 없습니다.</td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><input type="checkbox" /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px' }}>{row.publisher || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{row.status || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{row.month || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{row.owner || '-'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{row.receivedAt || row.receivedStart || '-'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{row.installedAt || row.installEnd || '-'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{row.customerName || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{row.customerNo || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{row.brand || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{row.productName || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{row.memo || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(Number(row.fee) || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{row.depositAt || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
