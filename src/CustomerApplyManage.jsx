import React, { useState, useEffect } from 'react'
import './receipt.css'

const STORE_KEY = 'allrental_apply_links'

export default function CustomerApplyManage() {
  const [list, setList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', customerName: '', customerNo: '', brand: '', productName: '',
    regulation: '', management: '', phone: '', address: '', startDate: '', endDate: '', active: true
  })
  const [search, setSearch] = useState({ startDate: '', endDate: '', status: '전체', customerName: '', customerNo: '' })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setList(JSON.parse(raw))
    } catch {}
  }, [])

  const filtered = list.filter(item => {
    if (search.startDate && (item.startDate || '') < search.startDate) return false
    if (search.endDate && (item.endDate || '') > search.endDate) return false
    if (search.status !== '전체') {
      if (search.status === '활성' && !item.active) return false
      if (search.status === '비활성' && item.active) return false
    }
    if (search.customerName && !((item.customerName || '') + (item.name || '')).includes(search.customerName)) return false
    if (search.customerNo && !(item.customerNo || '').includes(search.customerNo)) return false
    return true
  })

  const create = () => {
    if (!form.name || !form.customerName) return alert('링크명과 고객명은 필수입니다.')
    const token = Math.random().toString(36).slice(2)
    const item = { id: Date.now().toString(), ...form, token, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    const next = [item, ...list]
    setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)); setShowForm(false); setForm({
      name: '', customerName: '', customerNo: '', brand: '', productName: '', regulation: '', management: '', phone: '', address: '', startDate: '', endDate: '', active: true
    })
  }
  const toggle = (item) => {
    const next = list.map(x => (x.id === item.id ? { ...x, active: !x.active, updatedAt: new Date().toISOString() } : x))
    setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next))
  }
  const remove = (id) => { if (!confirm('삭제하시겠습니까?')) return; const next = list.filter(x => x.id !== id); setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)) }

  return (
    <div className="apply-root" style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>고객 접수정보 링크 관리</h2>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13 }}>고객이 접수 정보를 직접 입력할 수 있는 링크를 생성합니다.</p>
        </div>
        <button className="btn btn-primary-x" onClick={() => setShowForm(v => !v)} style={{ padding: '10px 18px', fontSize: 13 }}>+ 새 링크 만들기</button>
      </div>

      {/* 검색 카드 */}
      <div className="apply-search-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="field-group">
            <label className="field-label">시작일</label>
            <input className="input-x" type="date" value={search.startDate} onChange={e => setSearch({ ...search, startDate: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label">종료일</label>
            <input className="input-x" type="date" value={search.endDate} onChange={e => setSearch({ ...search, endDate: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label">진행상황</label>
            <select className="input-x" value={search.status} onChange={e => setSearch({ ...search, status: e.target.value })}>
              <option>전체</option><option>활성</option><option>비활성</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">고객명</label>
            <input className="input-x" placeholder="고객명" value={search.customerName} onChange={e => setSearch({ ...search, customerName: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label">고객번호</label>
            <input className="input-x" placeholder="고객번호" value={search.customerNo} onChange={e => setSearch({ ...search, customerNo: e.target.value })} />
          </div>
        </div>
      </div>

      {/* 새 링크 폼 */}
      {showForm && (
        <div className="apply-form-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>새 링크 만들기</div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {[
              ['링크명', 'name', form.name, e => setForm({ ...form, name: e.target.value })],
              ['고객명', 'customerName', form.customerName, e => setForm({ ...form, customerName: e.target.value })],
              ['고객번호', 'customerNo', form.customerNo, e => setForm({ ...form, customerNo: e.target.value })],
              ['브랜드', 'brand', form.brand, e => setForm({ ...form, brand: e.target.value })],
              ['상품명', 'productName', form.productName, e => setForm({ ...form, productName: e.target.value })],
              ['규정', 'regulation', form.regulation, e => setForm({ ...form, regulation: e.target.value })],
              ['관리주기', 'management', form.management, e => setForm({ ...form, management: e.target.value })],
              ['연락처', 'phone', form.phone, e => setForm({ ...form, phone: e.target.value })],
              ['주소', 'address', form.address, e => setForm({ ...form, address: e.target.value })],
              ['시작일', 'startDate', form.startDate, e => setForm({ ...form, startDate: e.target.value })],
              ['종료일', 'endDate', form.endDate, e => setForm({ ...form, endDate: e.target.value })],
            ].map(([label, key, value, handler]) => (
              <div key={key} className="field-group">
                <label className="field-label">{label}</label>
                <input className="input-x" value={value} onChange={handler} placeholder={label} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost-x" onClick={() => setShowForm(false)}>취소</button>
            <button className="btn btn-primary-x" onClick={create}>생성</button>
          </div>
        </div>
      )}

      {/* 결과 테이블 */}
      <div className="table-scroll" style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['상태','생성일','고객명','고객번호','브랜드','상품명','규정','최근수정','작업'].map(c => (
                <th key={c} style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>조회된 고객 입력 링크가 없습니다.</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${item.active ? 'ok' : 'warn'}`}>{item.active ? '활성' : '비활성'}</span>
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : '-'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{item.customerName || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>{item.customerNo || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>{item.brand || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>{item.productName || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>{item.regulation || '-'}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '-'}</td>
                  <td style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline-x" onClick={() => toggle(item)} style={{ fontSize: 12, padding: '6px 10px' }}>{item.active ? '비활성화' : '활성화'}</button>
                    <button className="btn btn-ghost-x" onClick={() => remove(item.id)} style={{ fontSize: 12, padding: '6px 10px' }}>삭제</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
