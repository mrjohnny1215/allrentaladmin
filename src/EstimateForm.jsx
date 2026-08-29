import React, { useState, useEffect } from 'react'

const STORE_KEY = 'allrental_estimates'
const PRODUCTS_KEY = 'allrental_products'

export default function EstimateForm() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setSaved(JSON.parse(raw))
    } catch {}
  }, [])

  const addItem = () => {
    if (!product) return alert('상품명을 입력해 주세요.')
    const next = [...items, { id: Date.now(), product, qty: Number(qty) || 1, price: Number(price) || 0 }]
    setItems(next)
    setProduct(''); setQty(1); setPrice(0)
  }
  const removeItem = (id) => setItems(items.filter((i) => i.id !== id))
  const total = items.reduce((s, i) => s + i.qty * i.price, 0)
  const save = () => {
    if (!name || !items.length) return alert('이름과 상품을 입력해 주세요.')
    const doc = { id: Date.now().toString(), name, note, items, total, createdAt: new Date().toISOString() }
    const next = [doc, ...saved]
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
    setSaved(next)
    setItems([]); setName(''); setNote('')
    alert('저장되었습니다.')
  }
  const load = (doc) => { setName(doc.name); setItems(doc.items); setNote(doc.note || '') }
  const del = (id) => { if (!confirm('삭제하시겠습니까?')) return; localStorage.setItem(STORE_KEY, JSON.stringify(saved.filter((s) => s.id !== id))); setSaved(saved.filter((s) => s.id !== id)) }
  const print = () => window.print()

  return (
    <div style={{ padding: 24 }}>
      <h2>견적서</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <input placeholder="고객명" value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input placeholder="상품" value={product} onChange={(e) => setProduct(e.target.value)} />
            <input type="number" placeholder="수량" value={qty} onChange={(e) => setQty(e.target.value)} />
            <input type="number" placeholder="단가" value={price} onChange={(e) => setPrice(e.target.value)} />
            <button onClick={addItem}>추가</button>
          </div>
          <textarea placeholder="메모" value={note} onChange={(e) => setNote(e.target.value)} />
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead><tr><th>상품</th><th>수량</th><th>단가</th><th>소계</th><th>삭제</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.product}</td>
                  <td>{i.qty}</td>
                  <td>{i.price.toLocaleString()}</td>
                  <td>{(i.qty * i.price).toLocaleString()}</td>
                  <td><button onClick={() => removeItem(i.id)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, fontWeight: 800 }}>합계: {total.toLocaleString()}원</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={save}>저장</button>
            <button onClick={print}>인쇄</button>
          </div>
        </div>
        <div style={{ width: 260 }}>
          <h3>저장된 견적서</h3>
          {saved.map((doc) => (
            <div key={doc.id} style={{ border: '1px solid #e5e7eb', padding: 10, borderRadius: 12, marginBottom: 8 }}>
              <div>{doc.name} / {new Date(doc.createdAt).toLocaleString('ko-KR')}</div>
              <div>{doc.total.toLocaleString()}원</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => load(doc)}>불러오기</button>
                <button onClick={() => del(doc.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
