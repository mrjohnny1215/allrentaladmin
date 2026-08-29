import React, { useState, useEffect } from 'react'

const STORE_KEY = 'allrental_suggestions'

export default function SuggestionBoard() {
  const [list, setList] = useState([])
  const [type, setType] = useState('문의')
  const [keyword, setKeyword] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setList(JSON.parse(raw))
    } catch {}
  }, [])

  const add = (e) => {
    e.preventDefault()
    if (!content.trim()) return alert('내용을 입력해 주세요.')
    const item = { id: Date.now().toString(), type, content, createdAt: new Date().toISOString() }
    const next = [item, ...list]
    setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)); setContent('')
  }
  const del = (id) => { if (!confirm('삭제하시겠습니까?')) return; const next = list.filter((x) => x.id !== id); setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)) }

  const filtered = list.filter((item) => {
    if (type && item.type !== type) return false
    if (keyword && !item.content.toLowerCase().includes(keyword.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ padding: 24 }}>
      <h2>공지문의</h2>
      <form onSubmit={add} style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
        <select value={type} onChange={(e) => setType(e.target.value)}><option>공지</option><option>문의</option></select>
        <textarea placeholder="내용" value={content} onChange={(e) => setContent(e.target.value)} />
        <button type="submit">등록</button>
      </form>
      <hr style={{ margin: '24px 0' }} />
      <input placeholder="검색어" value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ marginBottom: 12 }} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>구분</th><th>내용</th><th>등록일</th><th>액션</th></tr></thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.type}</td>
              <td>{item.content}</td>
              <td>{new Date(item.createdAt).toLocaleString('ko-KR')}</td>
              <td><button onClick={() => del(item.id)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
