import React, { useState, useEffect } from 'react'

const STORE_KEY = 'allrental_submissions'

export default function SubmissionList() {
  const [list, setList] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setList(JSON.parse(raw))
    } catch {}
  }, [])

  const filtered = list.filter((item) => {
    const d = new Date(item.createdAt)
    if (fromDate && d < new Date(fromDate)) return false
    if (toDate && d > new Date(toDate + 'T23:59:59')) return false
    if (keyword) {
      const hay = `${item.name} ${item.phone} ${item.memo}`.toLowerCase()
      return hay.includes(keyword.toLowerCase())
    }
    return true
  })
  const onDelete = (id) => { if (!confirm('삭제하시겠습니까?')) return; const next = list.filter((item) => item.id !== id); setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)) }

  return (
    <div style={{ padding: 24 }}>
      <h2>접수내역</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <input placeholder="검색어" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>고객명</th><th>전화번호</th><th>브랜드</th><th>등록일</th><th>액션</th></tr></thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td><td>{item.phone}</td><td>{item.brand}</td>
              <td>{new Date(item.createdAt).toLocaleString('ko-KR')}</td>
              <td><button onClick={() => onDelete(item.id)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
