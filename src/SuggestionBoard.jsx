import React, { useState, useEffect } from 'react'
import './receipt.css'

const STORE_KEY = 'allrental_suggestions'

export default function SuggestionBoard() {
  const [list, setList] = useState([])
  const [type, setType] = useState('공지')
  const [keyword, setKeyword] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/board-posts?type=' + encodeURIComponent(type))
      .then(r => r.ok ? r.json() : Promise.reject('no-api'))
      .then(data => { if (!cancelled) setList(Array.isArray(data) ? data : []) })
      .catch(() => {
        try {
          const raw = localStorage.getItem(STORE_KEY)
          if (!cancelled && raw) setList(JSON.parse(raw))
        } catch {}
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [type])

  const filtered = list.filter(item => {
    if (item.type && type && item.type !== type) return false
    if (keyword && !(item.title || '').toLowerCase().includes(keyword.toLowerCase()) && !(item.content || '').toLowerCase().includes(keyword.toLowerCase())) return false
    return true
  })

  const add = (e) => {
    e.preventDefault()
    if (!content.trim()) return alert('내용을 입력해 주세요.')
    const item = { id: Date.now().toString(), type, title: content.trim().slice(0, 40), content, createdAt: new Date().toISOString() }
    const next = [item, ...list]
    setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)); setContent('')
  }
  const del = (id) => { if (!confirm('삭제하시겠습니까?')) return; const next = list.filter(x => x.id !== id); setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)) }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 900, color: '#166534' }}>공지 / 문의 / 건의</h2>

      {/* 검색 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select className="input-x" value={type} onChange={e => setType(e.target.value)} style={{ width: 120 }}>
          <option value="공지">공지</option>
          <option value="문의">문의</option>
          <option value="건의">건의</option>
        </select>
        <input className="input-x" placeholder="검색어를 입력하세요" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button className="btn btn-primary-x" style={{ padding: '8px 16px', fontSize: 13 }}>검색</button>
        <button className="btn btn-primary-x" onClick={() => {}} style={{ padding: '8px 16px', fontSize: 13 }}>글쓰기</button>
      </div>

      {/* 글쓰기 */}
      <form onSubmit={add} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
        <textarea placeholder="내용" value={content} onChange={e => setContent(e.target.value)} className="input-x" style={{ minHeight: 80 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary-x" style={{ padding: '8px 18px', fontSize: 13 }}>등록</button>
        </div>
      </form>

      {/* 테이블 */}
      <div className="table-scroll" style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['No','작성일','제목','작성자'].map(c => (
                <th key={c} style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>불러오는 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>게시글이 없습니다.</td></tr>
            ) : filtered.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : '-'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${item.type === '공지' ? 'promo' : item.type === '문의' ? 'ok' : 'warn'}`}>{item.type}</span>
                    {item.isNew && <span style={{ color: '#2563eb', fontWeight: 900, fontSize: 12 }}>NEW</span>}
                    <span>{item.title || item.content}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{item.author || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
