/* ============================================================
   접수내역 (SubmissionList) 페이지
   - allnup.com 접수내역 화면 실제 기능 분석 결과 재구현
   - 검색: 시작일, 종료일, 키워드(고객명/연락처)
   - 테이블 컬럼: 접수일자, 담당자, 고객명, 연락처, 브랜드, 상품명,
     규정, 약정, 관리, 렌탈료, 특이사항, 건수, 자세히
   ============================================================ */
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './receipt.css'

const STORE_KEY = 'allrental_submissions'

const won = (n) => {
  const num = parseInt(String(n || '0').replace(/[^0-9]/g, ''), 10)
  return isNaN(num) ? String(n) : num.toLocaleString('ko-KR')
}

const fmtDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SubmissionList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [submissions, setSubmissions] = useState([])
  const [search, setSearch] = useState({ startDate: '', endDate: '', keyword: '' })
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    // localStorage에서 접수 데이터 불러오기
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setSubmissions(JSON.parse(raw))
    } catch {}

    // 접수 완료 직후 newAppId가 state로 전달되면 해당 접수를 강조
    if (location.state?.newAppId) {
      const found = submissions.find(s => s.id === location.state.newAppId)
      if (found) setSelected(found)
    }
  }, [location.state])

  // 검색 필터링
  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      // 날짜 필터
      if (search.startDate && s.createdAt < search.startDate + 'T00:00:00.000Z') return false
      if (search.endDate && s.createdAt > search.endDate + 'T23:59:59.999Z') return false
      // 키워드 필터 (고객명, 연락처)
      if (search.keyword) {
        const kw = search.keyword.toLowerCase()
        const inName = (s.customerName || '').toLowerCase().includes(kw)
        const inPhone = (s.contact || '').toLowerCase().includes(kw)
        if (!inName && !inPhone) return false
      }
      return true
    })
  }, [submissions, search])

  const handleSearchChange = (e) => setSearch({ ...search, [e.target.name]: e.target.value })
  const handleSearch = () => {} // 실시간 필터링이므로 별도 처리 불필요

  const resetSearch = () => setSearch({ startDate: '', endDate: '', keyword: '' })

  const DetailModal = ({ app, onClose }) => {
    if (!app) return null
    return (
      <div className="modal-veil" onClick={onClose}>
        <div className="modal-card" style={{ maxWidth: 800, maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-topbar">
            <div className="modal-topbar-title">접수 상세 — {app.id}</div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div style={{ display: 'grid', gap: 16 }}>
              {/* 기본 정보 */}
              <div className="receipt-section">
                <h3 className="section-title">접수 정보</h3>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', fontSize: 13 }}>
                  <div><b style={{ color: '#6b7280' }}>접수일자</b> {fmtDate(app.createdAt)}</div>
                  <div><b style={{ color: '#6b7280' }}>브랜드</b> {app.brand}</div>
                  <div><b style={{ color: '#6b7280' }}>고객유형</b> {app.customerType}</div>
                  <div><b style={{ color: '#6b7280' }}>상태</b> {app.status}</div>
                </div>
              </div>

              {/* 고객 정보 */}
              <div className="receipt-section">
                <h3 className="section-title">고객 정보</h3>
                <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                  <div><b style={{ color: '#6b7280' }}>고객명</b> {app.customerName}</div>
                  <div><b style={{ color: '#6b7280' }}>생년월일</b> {app.birthDate || '-'}</div>
                  <div><b style={{ color: '#6b7280' }}>연락처</b> {app.contact}</div>
                  <div><b style={{ color: '#6b7280' }}>결제정보</b> {app.paymentInfo || '-'}</div>
                </div>
              </div>

              {/* 사업자 정보 */}
              {app.customerType !== '개인' && (app.businessName || app.businessNumber) && (
                <div className="receipt-section">
                  <h3 className="section-title">사업자 정보</h3>
                  <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', fontSize: 13 }}>
                    <div><b style={{ color: '#6b7280' }}>상호명</b> {app.businessName || '-'}</div>
                    <div><b style={{ color: '#6b7280' }}>사업자번호</b> {app.businessNumber || '-'}</div>
                    <div><b style={{ color: '#6b7280' }}>법인등록번호</b> {app.corporationNumber || '-'}</div>
                    <div><b style={{ color: '#6b7280' }}>이메일</b> {app.emailId ? `${app.emailId}@${app.emailDomain}` : '-'}</div>
                  </div>
                </div>
              )}

              {/* 설치 주소 */}
              <div className="receipt-section">
                <h3 className="section-title">설치주소</h3>
                <div style={{ fontSize: 13 }}>
                  [{app.zipCode || ''}] {app.address || '-'} {app.detailAddress}
                </div>
              </div>

              {/* 제품 정보 목록 */}
              {app.items && app.items.map((item, idx) => (
                <div key={idx} className="product-info-card">
                  <div className="product-info-header">
                    <b>제품정보{idx + 1}</b>
                  </div>
                  <div className="product-info-grid" style={{ fontSize: 13 }}>
                    <div><b style={{ color: '#6b7280' }}>상품명</b> {item.productName}</div>
                    <div><b style={{ color: '#6b7280' }}>모델명</b> {item.modelName}</div>
                    <div><b style={{ color: '#6b7280' }}>색상</b> {item.color || '-'}</div>
                    <div><b style={{ color: '#6b7280' }}>규정</b> {item.regulation}</div>
                    <div><b style={{ color: '#6b7280' }}>약정</b> {item.contract}</div>
                    <div><b style={{ color: '#6b7280' }}>관리</b> {item.management}</div>
                    <div><b style={{ color: '#6b7280' }}>렌탈료</b> {item.rentalFee}</div>
                    <div><b style={{ color: '#6b7280' }}>프로모션</b> {item.promotion || '없음'}</div>
                  </div>
                </div>
              ))}

              {/* 특이사항 */}
              {app.notes && (
                <div className="receipt-section">
                  <h3 className="section-title">특이사항</h3>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{app.notes}</div>
                </div>
              )}

              {/* 확인요청 */}
              {app.checkRequests && app.checkRequests.length > 0 && (
                <div className="receipt-section">
                  <h3 className="section-title">확인요청</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                    {app.checkRequests.map((r) => (
                      <span key={r} style={{ padding: '4px 10px', background: '#f3f4f6', borderRadius: 6 }}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="receipt-root" style={{ padding: 24 }}>
      <h2>접수내역</h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        총 {filtered.length}건의 접수가 있습니다.
      </p>

      {/* 검색 영역 */}
      <div className="receipt-section" style={{ marginBottom: 16 }}>
        <div className="field-grid">
          <div className="field-group">
            <label className="field-label">시작일</label>
            <input type="date" name="startDate" value={search.startDate} onChange={handleSearchChange} className="input-x" />
          </div>
          <div className="field-group">
            <label className="field-label">종료일</label>
            <input type="date" name="endDate" value={search.endDate} onChange={handleSearchChange} className="input-x" />
          </div>
          <div className="field-group" style={{ gridColumn: '1 / -1'}}>
            <label className="field-label">키워드 (고객명 / 연락처)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" name="keyword" value={search.keyword} onChange={handleSearchChange}
                placeholder="고객명 또는 연락처 입력" className="input-x"
              />
              <button className="btn btn-ghost-x" onClick={resetSearch} style={{ padding: '8px 16px', fontSize: 13 }}>초기화</button>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
          접수 내역이 없습니다.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="submission-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>접수일자</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>브랜드</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>고객명</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>연락처</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>상품명</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>규정</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>약정</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>관리</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>렌탈료</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>특이사항</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>건수</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>자세히</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const firstItem = s.items && s.items[0]
                const itemCount = s.items ? s.items.length : 0
                return (
                  <tr
                    key={s.id}
                    style={{
                      background: s.id === location.state?.newAppId ? '#eff6ff' : undefined,
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmtDate(s.createdAt)}</td>
                    <td style={{ padding: '10px 12px' }}>{s.brand}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.customerName}</td>
                    <td style={{ padding: '10px 12px' }}>{s.contact}</td>
                    <td style={{ padding: '10px 12px' }}>{firstItem?.productName || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{firstItem?.regulation || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{firstItem?.contract || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{firstItem?.management || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{firstItem?.rentalFee || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{s.notes || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{itemCount}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        className="btn btn-outline-x"
                        onClick={() => setSelected(s)}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >자세히</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 모달 */}
      {selected && <DetailModal app={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
