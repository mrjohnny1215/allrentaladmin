import React, { useState, useEffect } from 'react'

const MONTHS = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')}월`)
const STORE_KEY = 'allrental_settlements'

export default function SettlementManage() {
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [partner, setPartner] = useState('')
  const [owner, setOwner] = useState('')
  const [list, setList] = useState([])
  const [form, setForm] = useState({ month, partner, owner, amount: 0, memo: '' })
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setList(JSON.parse(raw))
    } catch {}
  }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const filtered = list.filter((item) => {
    if (partner && item.partner !== partner) return false
    if (owner && item.owner !== owner) return false
    if (month && item.month !== month) return false
    return true
  })
  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.partner || !form.owner) return alert('파트너와 담당자는 필수입니다.')
    if (editId) {
      const next = list.map((item) => (item.id === editId ? { ...item, ...form } : item))
      setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)); setEditId(null)
    } else {
      const item = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() }
      const next = [item, ...list]
      setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next))
    }
    setForm({ month, partner, owner, amount: 0, memo: '' })
  }
  const onEdit = (item) => { setForm(item); setEditId(item.id) }
  const onDelete = (id) => { if (!confirm('삭제하시겠습니까?')) return; const next = list.filter((item) => item.id !== id); setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)) }

  return (
    <div style={{ padding: 24 }}>
      <h2>정산서</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
        <select name="month" value={form.month} onChange={onChange}>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
        <input name="partner" placeholder="파트너" value={form.partner} onChange={onChange} />
        <input name="owner" placeholder="담당자" value={form.owner} onChange={onChange} />
        <input name="amount" type="number" placeholder="금액" value={form.amount} onChange={onChange} />
        <textarea name="memo" placeholder="메모" value={form.memo} onChange={onChange} />
        <button type="submit">{editId ? '수정' : '등록'}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ month, partner, owner, amount: 0, memo: '' }) }}>취소</button>}
      </form>
      <hr style={{ margin: '24px 0' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>월</th><th>파트너</th><th>담당자</th><th>금액</th><th>등록일</th><th>액션</th></tr></thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.month}</td><td>{item.partner}</td><td>{item.owner}</td><td>{Number(item.amount).toLocaleString()}원</td>
              <td>{new Date(item.createdAt).toLocaleString('ko-KR')}</td>
              <td><button onClick={() => onEdit(item)}>수정</button><button onClick={() => onDelete(item.id)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
