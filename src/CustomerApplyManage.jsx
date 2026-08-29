import React, { useState, useEffect } from 'react'

const STORE_KEY = 'allrental_apply_links'

export default function CustomerApplyManage() {
  const [list, setList] = useState([])
  const [linkName, setLinkName] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setList(JSON.parse(raw))
    } catch {}
  }, [])

  const create = () => {
    if (!linkName) return alert('링크명을 입력해 주세요.')
    const token = Math.random().toString(36).slice(2)
    const item = { id: Date.now().toString(), name: linkName, token, active: true, createdAt: new Date().toISOString() }
    const next = [item, ...list]
    setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)); setLinkName('')
  }
  const toggle = (item) => {
    const next = list.map((x) => (x.id === item.id ? { ...x, active: !x.active } : x))
    setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next))
  }
  const remove = (id) => { if (!confirm('삭제하시겠습니까?')) return; const next = list.filter((x) => x.id !== id); setList(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)) }

  return (
    <div style={{ padding: 24 }}>
      <h2>접수링크</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input placeholder="링크명" value={linkName} onChange={(e) => setLinkName(e.target.value)} />
        <button onClick={create}>생성</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>이름</th><th>토큰</th><th>링크</th><th>상태</th><th>액션</th></tr></thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.token}</td>
              <td>{typeof window !== 'undefined' ? `${window.location.origin}/apply/${item.token}` : ''}</td>
              <td>{item.active ? '활성' : '비활성'}</td>
              <td>
                <button onClick={() => toggle(item)}>{item.active ? '취소' : '활성화'}</button>
                <button onClick={() => remove(item.id)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
