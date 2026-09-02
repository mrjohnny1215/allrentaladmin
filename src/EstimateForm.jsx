import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { img } from './lib/imageUrl'
import './receipt.css'

const STORE_KEY = 'allrental_estimates'
const NO_IMG = '/assets/goods_image/no_image.jpg'
const won = (n) => (n ? Number(n).toLocaleString('ko-KR') : '0')

export default function EstimateForm() {
  const navigate = useNavigate()
  const [allProducts, setAllProducts] = useState([])
  const [meta, setMeta] = useState({ customerName: '', supplier: '', estimateDate: new Date().toISOString().slice(0,10), manager: '', contact: '', validity: '견적 당월 계약시' })
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState([])

  useEffect(() => {
    fetch('/data/products.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(setAllProducts)
      .catch(() => setAllProducts([]))
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setSaved(JSON.parse(raw))
    } catch {}
  }, [])

  const total = useMemo(() => items.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.price) || 0)), 0), [items])

  const addItem = () => {
    const next = [...items, {
      id: Date.now(), product: '', brand: '', modelName: '', color: '', capacity: '', size: '',
      regulation: '', management: '', qty: 1, price: 0, note: '', image: NO_IMG
    }]
    setItems(next)
  }
  const removeItem = (id) => setItems(items.filter(i => i.id !== id))
  const updateItem = (id, patch) => setItems(items.map(i => i.id === id ? { ...i, ...patch } : i))

  const pickProduct = (idx) => {
    const name = window.prompt('상품명 또는 모델명을 입력하세요.')
    if (!name) return
    const found = allProducts.find(p => (p.name || '').includes(name) || (p.model_code || '').includes(name))
    const target = found || { name, brand: '', model_code: '', images: [] }
    updateItem(items[idx].id, {
      product: target.name || name, brand: target.brand || '', modelName: target.model_code || '',
      image: (target.images && target.images[0]) || NO_IMG
    })
  }

  const save = () => {
    if (!meta.customerName || !items.length) return alert('고객명과 상품을 입력해 주세요.')
    const doc = { id: Date.now().toString(), meta, items, note, total, createdAt: new Date().toISOString() }
    const next = [doc, ...saved]
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
    setSaved(next)
    alert('저장되었습니다.')
  }
  const load = (doc) => { setMeta(doc.meta || {}); setItems(doc.items || []); setNote(doc.note || '') }
  const del = (id) => { if (!confirm('삭제하시겠습니까?')) return; localStorage.setItem(STORE_KEY, JSON.stringify(saved.filter(s => s.id !== id))); setSaved(saved.filter(s => s.id !== id)) }
  const print = () => window.print()

  const row = (item) => (
    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.brand} onChange={e => updateItem(item.id, { brand: e.target.value })} placeholder="브랜드" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.product} onChange={e => updateItem(item.id, { product: e.target.value })} placeholder="상품명" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.modelName} onChange={e => updateItem(item.id, { modelName: e.target.value })} placeholder="모델명" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.color} onChange={e => updateItem(item.id, { color: e.target.value })} placeholder="색상" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.capacity} onChange={e => updateItem(item.id, { capacity: e.target.value })} placeholder="용량" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.size} onChange={e => updateItem(item.id, { size: e.target.value })} placeholder="사이즈" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.regulation} onChange={e => updateItem(item.id, { regulation: e.target.value })} placeholder="규정" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.management} onChange={e => updateItem(item.id, { management: e.target.value })} placeholder="관리유형" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" type="number" value={item.qty} onChange={e => updateItem(item.id, { qty: Number(e.target.value) || 1 })} /> 대</td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.contract || ''} onChange={e => updateItem(item.id, { contract: e.target.value })} placeholder="약정" /></td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" type="number" value={item.price} onChange={e => updateItem(item.id, { price: Number(e.target.value) || 0 })} /></td>
      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{((Number(item.qty) || 0) * (Number(item.price) || 0)).toLocaleString()}원</td>
      <td style={{ padding: '8px 10px' }}><input className="input-x" value={item.note} onChange={e => updateItem(item.id, { note: e.target.value })} placeholder="특이사항" /></td>
      <td style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <img src={item.image || NO_IMG} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid #e5e7eb' }} />
          <button type="button" className="btn btn-ghost-x" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => pickProduct(items.indexOf(item))}>선택</button>
        </div>
      </td>
    </tr>
  )

  return (
    <div className="estimate-root" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 26, fontWeight: 900, letterSpacing: 6, textAlign: 'center' }}>견 적 서</h2>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="field-label" style={{ width: 80 }}>고객명</label>
            <input className="input-x" value={meta.customerName} onChange={e => setMeta({ ...meta, customerName: e.target.value })} placeholder="고객명" />
            <span style={{ fontWeight: 900 }}>귀하</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="field-label" style={{ width: 80 }}>견적일</label>
            <input className="input-x" type="date" value={meta.estimateDate} onChange={e => setMeta({ ...meta, estimateDate: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="field-label" style={{ width: 80 }}>유효기간</label>
            <input className="input-x" value={meta.validity} onChange={e => setMeta({ ...meta, validity: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="field-label" style={{ width: 80 }}>공급자</label>
            <input className="input-x" value={meta.supplier} onChange={e => setMeta({ ...meta, supplier: e.target.value })} placeholder="공급자" />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="field-label" style={{ width: 80 }}>담당자</label>
            <input className="input-x" value={meta.manager} onChange={e => setMeta({ ...meta, manager: e.target.value })} placeholder="담당자" />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="field-label" style={{ width: 80 }}>연락처</label>
            <input className="input-x" value={meta.contact} onChange={e => setMeta({ ...meta, contact: e.target.value })} placeholder="연락처" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button type="button" className="btn btn-ghost-x" onClick={() => navigate('/admin/reception')}>리스트</button>
        <button type="button" className="btn btn-primary-x" onClick={print}>인쇄/저장</button>
        <button type="button" className="btn btn-primary-x" onClick={addItem}>+ 제품 추가</button>
        <button type="button" className="btn btn-ghost-x" onClick={() => { setItems([]); setNote('') }}>초기화</button>
      </div>

      <div className="table-scroll" style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['브랜드','상품명','모델명','색상','용량','사이즈','규정','관리유형','수량','렌탈료_약정','렌탈료_단가','렌탈료_합계','특이사항','이미지'].map(c => (
                <th key={c} style={{ padding: '10px 10px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={14} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>제품을 추가해주세요.</td></tr>
            ) : (
              items.map(item => row(item))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="특이사항" style={{ flex: 1, minHeight: 80, padding: 10, borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }} />
        <div style={{ fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>합계: {total.toLocaleString()}원</div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost-x" onClick={() => {}}>취소</button>
        <button type="button" className="btn btn-primary-x" onClick={save}>저장</button>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 900 }}>저장된 견적서</h3>
        {saved.length === 0 && <div style={{ color: '#9ca3af', padding: 20, textAlign: 'center' }}>저장된 견적서가 없습니다.</div>}
        <div style={{ display: 'grid', gap: 10 }}>
          {saved.map(doc => (
            <div key={doc.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{doc.meta?.customerName || '이름 없음'}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>{new Date(doc.createdAt).toLocaleString('ko-KR')}</div>
                <div style={{ fontWeight: 700 }}>{Number(doc.total || 0).toLocaleString()}원</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-outline-x" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => load(doc)}>불러오기</button>
                <button type="button" className="btn btn-ghost-x" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => del(doc.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
