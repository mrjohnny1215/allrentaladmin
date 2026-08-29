import React, { useState, useEffect } from 'react'

const BRANDS = ['코웨이', '청호나이스', '쿠쿠', 'SK매직', '현대큐밍', 'LG', '웰스', '세스코']
const ESTIMATE_KEY = 'allrental_estimate_drafts'

export default function Counsel() {
  const [mode, setMode] = useState('simple')
  const [brand, setBrand] = useState('')
  const [keyword, setKeyword] = useState('')
  const [list, setList] = useState([])
  const [form, setForm] = useState({ name: '', phone: '', brand: '', memo: '' })
  const [cart, setCart] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('allrental_counsel')
      if (raw) setList(JSON.parse(raw))
    } catch {}
  }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const add = (e) => {
    e.preventDefault()
    if (!form.name || !form.phone) return alert('이름과 전화번호는 필수입니다.')
    if (brand && form.brand !== brand) return alert('브랜드가 일치하지 않습니다.')
    const item = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() }
    const next = [item, ...list]
    setList(next)
    localStorage.setItem('allrental_counsel', JSON.stringify(next))
    setForm({ name: '', phone: '', brand: '', memo: '' })
  }
  const pushEstimate = (item) => {
    const draft = { customer: item.name, phone: item.phone, brand: item.brand, items: [], createdAt: new Date().toISOString() }
    const next = [draft, ...cart]
    setCart(next)
    localStorage.setItem(ESTIMATE_KEY, JSON.stringify(next))
    alert('견적서에 담았습니다.')
  }

  const filtered = list.filter((item) => {
    if (brand && item.brand !== brand) return false
    if (!keyword) return true
    const hay = `${item.name} ${item.phone} ${item.memo}`.toLowerCase()
    return hay.includes(keyword.toLowerCase())
  })

  return (
    <div style={{ padding: 24 }}>
      <h2>상담</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button onClick={() => setMode('simple')}>간단 모드</button>
        <button onClick={() => setMode('detail')}>상세 모드</button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">브랜드 전체</option>
          {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input placeholder="검색어" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>
      <form onSubmit={add} style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
        <input name="name" placeholder="고객명" value={form.name} onChange={onChange} />
        <input name="phone" placeholder="전화번호" value={form.phone} onChange={onChange} />
        <input name="brand" placeholder="브랜드" value={form.brand} onChange={onChange} />
        <textarea name="memo" placeholder="상담 내용" value={form.memo} onChange={onChange} />
        <button type="submit">등록</button>
      </form>
      <hr style={{ margin: '24px 0' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>고객명</th><th>전화번호</th><th>브랜드</th><th>등록일</th><th>견적담기</th></tr></thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.phone}</td>
              <td>{item.brand}</td>
              <td>{new Date(item.createdAt).toLocaleString('ko-KR')}</td>
              <td><button onClick={() => pushEstimate(item)}>견적담기</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
