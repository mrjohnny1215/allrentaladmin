import React, { useState, useEffect } from 'react'

const TYPES = ['개인', '사업자']
const BRANDS = ['코웨이', '청호나이스', '쿠쿠', 'SK매직', '현대큐밍', 'LG', '웰스', '세스코']
const STORE_KEY = 'allrental_submissions'

export default function Main() {
  const [form, setForm] = useState({ customerType: '개인', name: '', phone: '', email: '', brand: '', address: '', memo: '', bizNo: '', bizName: '' })
  const [list, setList] = useState([])
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setList(JSON.parse(raw))
    } catch {}
  }, [])

  const saveList = (next) => { setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)) }
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.phone) return alert('이름과 전화번호는 필수입니다.')
    if (form.customerType === '사업자' && (!form.bizNo || !form.bizName)) return alert('사업자 번호와 상호명을 입력해 주세요.')
    if (editId) {
      const next = list.map((item) => (item.id === editId ? { ...item, ...form } : item))
      saveList(next)
      setEditId(null)
    } else {
      const item = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() }
      saveList([item, ...list])
    }
    setForm({ customerType: '개인', name: '', phone: '', email: '', brand: '', address: '', memo: '', bizNo: '', bizName: '' })
  }
  const onEdit = (item) => { setForm(item); setEditId(item.id) }
  const onDelete = (id) => { if (!confirm('삭제하시겠습니까?')) return; saveList(list.filter((item) => item.id !== id)) }
  const brandValid = (b) => BRANDS.includes(b)

  return (
    <div style={{ padding: 24 }}>
      <h2>접수</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        <select name="customerType" value={form.customerType} onChange={onChange}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input name="name" placeholder="이름" value={form.name} onChange={onChange} />
        <input name="phone" placeholder="전화번호" value={form.phone} onChange={onChange} />
        <input name="email" placeholder="이메일" value={form.email} onChange={onChange} />
        <input name="brand" placeholder="브랜드" value={form.brand} onChange={onChange} />
        {!brandValid(form.brand) && form.brand && <div style={{ color: 'crimson' }}>브랜드명이 올바르지 않습니다.</div>}
        <input name="address" placeholder="주소" value={form.address} onChange={onChange} />
        <textarea name="memo" placeholder="메모" value={form.memo} onChange={onChange} />
        {form.customerType === '사업자' && (
          <>
            <input name="bizNo" placeholder="사업자 번호" value={form.bizNo} onChange={onChange} />
            <input name="bizName" placeholder="상호명" value={form.bizName} onChange={onChange} />
          </>
        )}
        <button type="submit">{editId ? '수정' : '등록'}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ customerType: '개인', name: '', phone: '', email: '', brand: '', address: '', memo: '', bizNo: '', bizName: '' }) }}>취소</button>}
      </form>
      <hr style={{ margin: '24px 0' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>고객유형</th><th>이름</th><th>전화번호</th><th>브랜드</th><th>등록일</th><th>액션</th></tr></thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id}>
              <td>{item.customerType}</td>
              <td>{item.name}</td>
              <td>{item.phone}</td>
              <td>{item.brand}</td>
              <td>{new Date(item.createdAt).toLocaleString('ko-KR')}</td>
              <td><button onClick={() => onEdit(item)}>수정</button><button onClick={() => onDelete(item.id)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
