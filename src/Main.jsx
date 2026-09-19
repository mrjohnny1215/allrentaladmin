/* ============================================================
   접수 (Main) 페이지
   - allnup.com 접수 화면 실제 기능 분석 결과 재구현
   - 상담에서 전달한 상품 정보가 자동 입력됨
   - 고객정보, 설치주소, 제품정보, 확인요청, 특이사항 영역
   - 미리보기 + 내용 복사 + 최종 접수
   ============================================================ */
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import './receipt.css'

const BRANDS = ['코웨이', '청호나이스', '쿠쿠', 'SK매직', '현대큐밍', 'LG', '웰스', '세스코', '직접입력']
const CUSTOMER_TYPES = ['개인', '개인사업자', '법인사업자']
const PROMOTION_OPTS = ['없음', '있음']
const CHECK_REQUESTS = [
  { label: '사전답사', value: 'pre_visit' },
  { label: '난공사 요청', value: 'hard_construction' },
  { label: '타사정보', value: 'other_company' },
  { label: '기존 제품 수거', value: 'product_collect' },
  { label: '자체접수', value: 'self_receipt' },
]

const won = (n) => (n ? Number(n).toLocaleString('ko-KR') : '0')
const STORE_KEY = 'allrental_submissions'

const openAddressSearch = (onSelect) => {
  const launch = () => {
    if (!window.daum?.Postcode) { alert('주소 검색을 불러오지 못했습니다. 다시 시도해 주세요.'); return }
    new window.daum.Postcode({
      oncomplete: (data) => onSelect({ zip: data.zonecode, address: data.roadAddress || data.jibunAddress }),
    }).open()
  }
  if (window.daum?.Postcode) { launch(); return }
  const script = document.createElement('script')
  script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
  script.onload = launch
  script.onerror = () => alert('주소 검색을 불러오지 못했습니다. 다시 시도해 주세요.')
  document.head.appendChild(script)
}

/* ==================== 색상 선택 ==================== */
function ColorSelector({ colors, value, onChange }) {
  if (!colors || colors.length === 0) return null
  return (
    <div className="color-selector">
      {colors.map((c) => (
        <button
          key={c} type="button"
          onClick={() => onChange(c)}
          className={value === c ? 'on' : ''}
        >{c}</button>
      ))}
    </div>
  )
}

/* ==================== 제품 정보 카드 ==================== */
function ProductInfoCard({ item, onRemove, itemIndex, showRemove }) {
  return (
    <div className="product-info-card">
      <div className="product-info-header">
        <b style={{ fontSize: 14, fontWeight: 800 }}>제품정보{itemIndex > 0 ? itemIndex + 1 : ''}</b>
        {showRemove && (
          <button type="button" onClick={onRemove} className="product-remove-btn" title="삭제">✕</button>
        )}
      </div>
      <div className="product-info-grid">
        <div><b style={{ color: '#6b7280' }}>* 상품명</b> <span style={{ color: '#1d4ed8' }}>{item.productName || '-'}</span></div>
        <div><b style={{ color: '#6b7280' }}>* 모델명</b> {item.modelName || '-'}</div>
        <div><b style={{ color: '#6b7280' }}>색상</b> {item.color || '-'}</div>
        <div><b style={{ color: '#6b7280' }}>* 규정</b> {item.regulation || '-'}</div>
        <div><b style={{ color: '#6b7280' }}>* 약정</b> {item.contract || '-'}</div>
        <div><b style={{ color: '#6b7280' }}>* 관리</b> {item.management || '-'}</div>
        <div><b style={{ color: '#6b7280' }}>* 렌탈료</b> <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{item.rentalFee || '-'}</span></div>
        <div><b style={{ color: '#6b7280' }}>* 프로모션</b>
          <span style={{ marginLeft: 8 }}>{item.promotion || '없음'}</span>
        </div>
      </div>
    </div>
  )
}

/* ==================== 렌탈 옵션 선택 모달 ==================== */
function RentalOptionModal({ open, onClose, product, onConfirm }) {
  if (!open || !product) return null
  const matrix = product.pricing_matrix || []
  const [selectedIdx, setSelectedIdx] = useState(null)

  const optionList = useMemo(() => {
    return matrix.map((r, i) => ({
      ...r, _idx: i,
      label: r.plan_label || `${r.years}${r.contract}`,
      groupKey: `${r.rule_raw || r.contract} · ${r.mgmt_cycle || r.mgmt || ''}`,
    }))
  }, [matrix])

  const grouped = useMemo(() => {
    const map = {}
    optionList.forEach(opt => {
      if (!map[opt.groupKey]) map[opt.groupKey] = []
      map[opt.groupKey].push(opt)
    })
    return Object.entries(map)
  }, [optionList])

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 720, maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-topbar">
          <div className="modal-topbar-title">
            {product.brand} / {product.name} / {product.model_code}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ padding: 16, overflowY: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#374151' }}>
            접수 상품 선택 — 렌탈 옵션을 선택해 주세요.
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {grouped.map(([group, opts]) => (
              <div key={group} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, background: '#f9fafb' }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: '#374151' }}>{group}</div>
                <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                  {opts.map((opt) => (
                    <button
                      key={opt._idx} type="button"
                      onClick={() => setSelectedIdx(opt._idx)}
                      style={{
                        textAlign: 'center', padding: '10px', borderRadius: 8,
                        border: selectedIdx === opt._idx ? '2px solid #2563eb' : '1px solid #d1d5db',
                        background: selectedIdx === opt._idx ? '#eff6ff' : '#fff',
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{opt.years}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{opt.plan_label || ''}</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>{won(opt.monthly_fee)}원</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
            <button className="btn btn-ghost-x" onClick={onClose} style={{ padding: '10px 24px', fontSize: 13 }}>취소</button>
            <button
              className="btn btn-primary-x"
              onClick={() => {
                if (selectedIdx === null) { alert('렌탈 옵션을 선택해 주세요.') }
                else { onConfirm(optionList[selectedIdx]); onClose() }
              }}
              style={{ padding: '10px 24px', fontSize: 13 }}
            >전송</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==================== 미리보기 텍스트 ==================== */
function BirthDateField({ value, onChange }) {
  const yearRef = useRef(null)
  const monthRef = useRef(null)
  const dayRef = useRef(null)
  const [parts, setParts] = useState(() => {
    const [year = '', month = '', day = ''] = (value || '').split('-')
    return { year, month, day }
  })

  useEffect(() => {
    const [year = '', month = '', day = ''] = (value || '').split('-')
    setParts({ year, month, day })
  }, [value])

  const update = (key, raw) => {
    const limit = key === 'year' ? 4 : 2
    const next = { ...parts, [key]: raw.replace(/\D/g, '').slice(0, limit) }
    setParts(next)
    const complete = next.year.length === 4 && next.month.length === 2 && next.day.length === 2
    onChange(complete ? `${next.year}-${next.month}-${next.day}` : '')
    if (key === 'year' && next.year.length === 4) monthRef.current?.focus()
    if (key === 'month' && next.month.length === 2) dayRef.current?.focus()
  }

  const back = (event, key, previousRef) => {
    if (event.key === 'Backspace' && !parts[key]) previousRef.current?.focus()
  }

  return <div className="birth-date-fields" aria-label="생년월일">
    <input ref={yearRef} inputMode="numeric" maxLength={4} value={parts.year} onChange={e => update('year', e.target.value)} placeholder="YYYY" aria-label="생년" />
    <span>-</span>
    <input ref={monthRef} inputMode="numeric" maxLength={2} value={parts.month} onChange={e => update('month', e.target.value)} onKeyDown={e => back(e, 'month', yearRef)} placeholder="MM" aria-label="생월" />
    <span>-</span>
    <input ref={dayRef} inputMode="numeric" maxLength={2} value={parts.day} onChange={e => update('day', e.target.value)} onKeyDown={e => back(e, 'day', monthRef)} placeholder="DD" aria-label="생일" />
  </div>
}

const BANK_OPTIONS = [
  ['국민은행', '/images/banks/kb.svg'], ['신한은행', '/images/banks/shinhan.png'], ['우리은행', '/images/banks/woori.png'], ['하나은행', '/images/banks/hana.svg'],
  ['농협은행', '/images/banks/nh.svg'], ['기업은행', '/images/banks/ibk.png'], ['카카오뱅크', '/images/banks/kakaobank.png'], ['K뱅크', '/images/banks/kbank.svg'], ['토스뱅크', '/images/banks/toss.svg'],
  ['SC제일은행', '/images/banks/sc.png'], ['부산은행', '/images/banks/bnk.png'], ['대구은행', '/images/banks/dgb.svg'], ['경남은행', '/images/banks/knbank.png'],
]
const CARD_OPTIONS = [
  ['국민카드', '/images/cards/kbcard.jpg'],
  ['신한카드', '/images/cards/shinhancard.jpg'],
  ['삼성카드', '/images/cards/samsungcard.jpg'],
  ['현대카드', '/images/cards/hyundaicard.jpg'],
  ['롯데카드', '/images/cards/lottecard.jpg'],
  ['우리카드', '/images/cards/wooricard.jpg'],
  ['하나카드', '/images/cards/hanacard.jpg'],
  ['NH농협카드', '/images/banks/nh.svg'],
  ['BC카드', '/images/cards/bccard.jpg'],
]

const BANK_ACCOUNT_RULES = {
  국민은행: [10, 14], 신한은행: [10, 14], 우리은행: [10, 16], 하나은행: [10, 14],
  농협은행: [10, 14], 기업은행: [10, 14], 카카오뱅크: [10, 13], K뱅크: [10, 14],
  토스뱅크: [10, 14], SC제일은행: [10, 14], 부산은행: [10, 14], 대구은행: [10, 14], 경남은행: [10, 14],
}

const getAccountWarning = (bankName, accountNumber) => {
  if (!bankName || !accountNumber) return ''
  const digits = accountNumber.replace(/\D/g, '')
  const [min, max] = BANK_ACCOUNT_RULES[bankName] || [10, 16]
  if (digits.length < min || digits.length > max) return bankName + ' 계좌번호는 숫자 ' + min + '~' + max + '자리로 입력해 주세요.'
  return ''
}

function IconPicker({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(([name]) => name === value)
  const renderIcon = (option) => option?.[1]?.startsWith('/')
    ? <img src={option[1]} alt="" style={{ width: option[1].startsWith('/images/cards/') ? 42 : 23, height: 23, objectFit: 'contain', borderRadius: 6 }} />
    : <span style={{ width: 23, height: 23, display: 'grid', placeItems: 'center', fontSize: 17 }}>{option?.[1] || '•'}</span>
  return <div style={{ position: 'relative' }}>
    <button type="button" className="input-x" onClick={() => setOpen((v) => !v)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer' }}>
      <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>{selected && renderIcon(selected)}<span>{selected?.[0] || placeholder}</span></span><span>⌄</span>
    </button>
    {open && <div style={{ position: 'absolute', zIndex: 40, top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: 260, overflowY: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, boxShadow: '0 12px 24px rgba(15,23,42,.16)' }}>
      {options.map((option) => <button key={option[0]} type="button" onClick={() => { onChange(option[0]); setOpen(false) }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 0, borderBottom: '1px solid #eef2f7', background: value === option[0] ? '#eff6ff' : '#fff', color: '#0f172a', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        {renderIcon(option)}<span>{option[0]}</span>
      </button>)}
    </div>}
  </div>
}

function buildPreviewText(form, productItems) {
  const lines = []
  lines.push('접수 식별정보')
  lines.push(`${form.brand || '-'} / ${form.customerType || '-'}`)
  lines.push('')
  lines.push(form.customerName || '-')
  lines.push(form.birthDate || '')
  lines.push(form.contact || '-')
  lines.push(`[${form.zipCode || ''}] ${form.address || ''}`)
  lines.push('')
  productItems.forEach((item, i) => {
    lines.push('────────────────')
    lines.push(`제품정보${i + 1}`)
    lines.push(`${item.productName || '-'} / ${item.modelName || '-'}`)
    lines.push(`${item.regulation || '-'} / ${item.contract || '-'} / ${item.management || '-'}`)
    if (item.promotion && item.promotion !== '없음') lines.push(item.promotion)
    lines.push(`${item.rentalFee || '-'}원`)
    lines.push('')
  })
  if (form.notes) {
    lines.push('────────────────')
    lines.push('특이사항')
    lines.push(form.notes)
    lines.push('')
  }
  return lines.join('\n')
}

/* ==================== 메인 접수 컴포넌트 ==================== */
export default function Main() {
  const navigate = useNavigate()
  const [allProducts, setAllProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [productsData, setProductsData] = useState(null)
  const [form, setForm] = useState({
    customerType: '개인', brand: '', brandInput: '',
    businessName: '', businessNumber: '', corporationNumber: '',
    emailId: '', emailDomain: '', customerName: '', birthDate: '',
    contact: '', paymentType: 'account', bankName: '', accountNumber: '',
    cardCompany: '', cardNumber: '', cardExpiry: '', paymentInfo: '', zipCode: '', address: '', detailAddress: '',
    notes: '가장 빠른 설치 요청', promotion: '없음', promotionText: '',
    checkRequests: [],
  })
  const [productItems, setProductItems] = useState([])
  const [savedReceptions, setSavedReceptions] = useState([])
  const [receiving, setReceiving] = useState(false)
  const [optionModalOpen, setOptionModalOpen] = useState(false)
  const [editingItemIdx, setEditingItemIdx] = useState(0)

  useEffect(() => {
    // 상담에서 전달한 상품 정보 받기
    const raw = sessionStorage.getItem('allrental_selected_product')
    if (raw) {
      try {
        const payload = JSON.parse(raw)
        const product = payload.product || payload
        setProductsData(product)
        const matrix = product.pricing_matrix || []
        const defaultOpt = matrix.find(r => r.contract === '신규' && r.years === '5년') || matrix[0]
        if (defaultOpt) {
          setProductItems([{
            productId: product.id,
            productName: product.name,
            modelName: product.model_code,
            brand: product.brand,
            colors: product.colors || [],
            color: product.colors?.[0] || '',
            regulation: defaultOpt.rule_raw || defaultOpt.contract,
            contract: defaultOpt.plan_label || `${defaultOpt.years}${defaultOpt.contract}`,
            management: defaultOpt.mgmt_cycle || defaultOpt.mgmt,
            rentalFee: won(defaultOpt.monthly_fee) + '원',
            rentalOptionId: defaultOpt._idx || 0,
            selectedOption: defaultOpt,
            fullProduct: product,
          }])
        } else {
          setProductItems([{
            productId: product.id,
            productName: product.name,
            modelName: product.model_code,
            brand: product.brand,
            colors: product.colors || [],
            color: product.colors?.[0] || '',
            fullProduct: product,
          }])
        }
        setForm(f => ({ ...f, brand: product.brand || '', customerName: payload.customerName || '', contact: payload.customerContact || '' }))
      } catch {}
    }

    fetch('/data/products.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(setAllProducts)
      .catch(() => setAllProducts([]))

    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setSavedReceptions(JSON.parse(raw))
    } catch {}
  }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const onCheckChange = (e) => {
    const val = e.target.value
    setForm(f => ({ ...f, checkRequests: f.checkRequests.includes(val)
      ? f.checkRequests.filter(x => x !== val) : [...f.checkRequests, val] }))
  }

  const onProductSearch = (e) => {
    setSearchTerm(e.target.value)
    if (e.target.value.trim().length < 2) { setSearchResults([]); return }
    const kw = e.target.value.toLowerCase()
    const results = allProducts.filter(p =>
      (p.name || '').toLowerCase().includes(kw) ||
      (p.model_code || '').toLowerCase().includes(kw) ||
      (p.brand || '').toLowerCase().includes(kw)
    ).slice(0, 10)
    setSearchResults(results)
  }

  const selectProduct = (product) => {
    const matrix = product.pricing_matrix || []
    const defaultOpt = matrix.find(r => r.contract === '신규' && r.years === '5년') || matrix[0]
    setProductItems([{
      productId: product.id,
      productName: product.name,
      modelName: product.model_code,
      brand: product.brand,
      colors: product.colors || [],
      color: product.colors?.[0] || '',
      regulation: defaultOpt?.rule_raw || defaultOpt?.contract || '',
      contract: defaultOpt?.plan_label || '',
      management: defaultOpt?.mgmt_cycle || defaultOpt?.mgmt || '',
      rentalFee: defaultOpt ? won(defaultOpt.monthly_fee) + '원' : '',
      rentalOptionId: defaultOpt ? (defaultOpt._idx || 0) : 0,
      selectedOption: defaultOpt,
      fullProduct: product,
    }])
    setSearchTerm('')
    setSearchResults([])
  }

  const addProduct = () => {
    setProductItems([...productItems, {
      productId: '', productName: '', modelName: '',
      color: '', colors: [], regulation: '', contract: '',
      management: '', rentalFee: '', selectedOption: null,
    }])
  }
  const updateProductItem = (idx, field, value) => {
    const next = [...productItems]
    next[idx] = { ...next[idx], [field]: value }
    setProductItems(next)
  }
  const removeProductItem = (idx) => {
    if (productItems.length < 2) return
    setProductItems(productItems.filter((_, i) => i !== idx))
  }
  const openOptionModal = (idx) => { setEditingItemIdx(idx); setOptionModalOpen(true) }
  const handleOptionConfirm = (opt) => {
    updateProductItem(editingItemIdx, 'regulation', opt.rule_raw || opt.contract)
    updateProductItem(editingItemIdx, 'contract', opt.plan_label || `${opt.years}${opt.contract}`)
    updateProductItem(editingItemIdx, 'management', opt.mgmt_cycle || opt.mgmt)
    updateProductItem(editingItemIdx, 'rentalFee', won(opt.monthly_fee) + '원')
    updateProductItem(editingItemIdx, 'rentalOptionId', opt._idx || 0)
    updateProductItem(editingItemIdx, 'selectedOption', opt)
  }
  const previewText = useMemo(() => buildPreviewText(form, productItems), [form, productItems])
  const accountWarning = useMemo(() => getAccountWarning(form.bankName, form.accountNumber), [form.bankName, form.accountNumber])

  const copyPreview = async () => {
    try { await navigator.clipboard.writeText(previewText); alert('내용이 복사되었습니다!') }
    catch { alert('복사에 실패했습니다.') }
  }

  const submitApplication = async (e) => {
    e.preventDefault()
    if (!form.customerName) return alert('고객명을 입력해 주세요.')
    if (!form.contact) return alert('연락처를 입력해 주세요.')
    if (!form.brand) return alert('브랜드를 선택해 주세요.')
    if (productItems.length === 0 || !productItems[0]?.productName) return alert('상품을 선택해 주세요.')
    if (productItems.some(item => !item.regulation || !item.contract || !item.management || !item.rentalFee))
      return alert('모든 제품 정보를 입력해 주세요.')
    if (form.paymentType === 'account') {
      if (!form.bankName || !form.accountNumber) return alert('은행과 계좌번호를 입력해 주세요.')
      if (accountWarning) return alert(accountWarning)
    }

    setReceiving(true)
    const application = {
      id: Date.now().toString(),
      customerType: form.customerType, brand: form.brand, brandInput: form.brandInput,
      businessName: form.businessName, businessNumber: form.businessNumber,
      corporationNumber: form.corporationNumber, emailId: form.emailId, emailDomain: form.emailDomain,
      customerName: form.customerName, birthDate: form.birthDate, contact: form.contact,
      paymentInfo: form.paymentType === 'card'
        ? [form.cardCompany, form.cardNumber, form.cardExpiry].filter(Boolean).join(' / ')
        : [form.bankName, form.accountNumber].filter(Boolean).join(' / '),
      zipCode: form.zipCode, address: form.address,
      detailAddress: form.detailAddress, notes: form.notes, promotion: form.promotion,
      promotionText: form.promotionText, checkRequests: form.checkRequests,
      items: productItems, createdAt: new Date().toISOString(), status: '접수완료',
    }
    let session = null
    try { session = JSON.parse(localStorage.getItem('allrental_auth') || 'null') } catch {}
    if (!session?.id) { setReceiving(false); return alert('로그인을 다시 진행해 주세요.') }
    const { data, error } = await supabase.functions.invoke('submission-review-v1', {
      body: { action: 'submit', id: session.id, submission: application },
    })
    if (error || data?.error) { setReceiving(false); return alert(data?.error || '접수 저장에 실패했습니다.') }
    application.id = data.review.id
    setSavedReceptions([application, ...savedReceptions])
    setTimeout(() => {
      setReceiving(false)
      alert(`접수가 완료되었습니다!\n\n브랜드: ${form.brand}\n고객명: ${form.customerName}\n연락처: ${form.contact}\n상품명: ${productItems[0]?.productName}`)
      sessionStorage.removeItem('allrental_selected_product')
      navigate('/admin/submission_list', { state: { newAppId: application.id } })
    }, 800)
  }

  const currentEditItem = productItems[editingItemIdx]

  return (
    <div className="receipt-root">
      <h2>접수</h2>
      <form id="receipt-form" onSubmit={submitApplication}>
        <div className="receipt-layout">
          <div className="receipt-main">

            {/* [유형] */}
            <div className="receipt-section">
              <h3 className="section-title">유형</h3>
              <div className="field-group">
                <label className="field-label required">* 브랜드</label>
                {form.brand === '직접입력' ? (
                  <input type="text" name="brandInput" value={form.brandInput} onChange={onChange}
                    placeholder="브랜드를 직접 입력하세요" className="input-x" />
                ) : (
                  <select name="brand" value={form.brand} onChange={onChange} className="input-x" disabled={productItems.length > 0}>
                    <option value="">선택하세요</option>
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
              </div>
              <div className="field-group">
                <label className="field-label required">* 고객유형</label>
                <select name="customerType" value={form.customerType} onChange={onChange} className="input-x">
                  {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* [사업자 정보] */}
            {form.customerType !== '개인' && (
              <div className="receipt-section">
                <h3 className="section-title">사업자 정보</h3>
                <div className="field-grid">
                  <div className="field-group"><label className="field-label">상호명</label>
                    <input type="text" name="businessName" value={form.businessName} onChange={onChange} placeholder="상호명" className="input-x" />
                  </div>
                  <div className="field-group"><label className="field-label">사업자번호</label>
                    <input type="text" name="businessNumber" value={form.businessNumber} onChange={onChange} placeholder="예: 123-45-67890" className="input-x" />
                  </div>
                  <div className="field-group"><label className="field-label">법인등록번호</label>
                    <input type="text" name="corporationNumber" value={form.corporationNumber} onChange={onChange} placeholder="법인등록번호" className="input-x" />
                  </div>
                  <div className="field-group"><label className="field-label">이메일</label>
                    <div className="email-input">
                      <input type="text" name="emailId" value={form.emailId} onChange={onChange} placeholder="아이디" className="input-x" style={{ flex: 2 }} />
                      <span>@</span>
                      <input type="text" name="emailDomain" value={form.emailDomain} onChange={onChange} placeholder="도메인 입력" className="input-x" style={{ flex: 2 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* [고객 정보] */}
            <div className="receipt-section">
              <h3 className="section-title">고객 정보</h3>
              <div className="field-group"><label className="field-label required">* 고객명</label>
                <input type="text" name="customerName" value={form.customerName} onChange={onChange} placeholder="고객명" className="input-x" />
              </div>
              <div className="field-grid">
                <div className="field-group"><label className="field-label required">* 생년월일</label>
                  <BirthDateField value={form.birthDate} onChange={(birthDate) => setForm(f => ({ ...f, birthDate }))} />
                </div>
                <div className="field-group"><label className="field-label required">* 연락처</label>
                  <input type="tel" name="contact" value={form.contact} onChange={onChange} placeholder="010-0000-0000" className="input-x" />
                </div>
              </div>
              <div className="field-group"><label className="field-label">결제정보</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button type="button" className={'btn ' + (form.paymentType === 'account' ? 'btn-primary-x' : 'btn-ghost-x')}
                    onClick={() => setForm(f => ({ ...f, paymentType: 'account' }))}>은행 + 계좌</button>
                  <button type="button" className={'btn ' + (form.paymentType === 'card' ? 'btn-primary-x' : 'btn-ghost-x')}
                    onClick={() => setForm(f => ({ ...f, paymentType: 'card' }))}>카드</button>
                </div>
                {form.paymentType === 'account' ? (
                  <div className="field-grid">
                    <IconPicker value={form.bankName} onChange={(bankName) => setForm(f => ({ ...f, bankName }))} options={BANK_OPTIONS} placeholder="은행 선택" />
                    <div>
                      <input type="text" inputMode="numeric" name="accountNumber" value={form.accountNumber} onChange={onChange}
                        placeholder="계좌번호" className="input-x" aria-describedby={accountWarning ? 'account-format-warning' : undefined}
                        style={accountWarning ? { borderColor: '#dc2626', boxShadow: '0 0 0 3px rgba(220,38,38,.12)' } : undefined} />
                      {accountWarning && <p id="account-format-warning" role="alert" style={{ margin: '6px 2px 0', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>{accountWarning}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="field-grid">
                    <IconPicker value={form.cardCompany} onChange={(cardCompany) => setForm(f => ({ ...f, cardCompany }))} options={CARD_OPTIONS} placeholder="카드사 선택" />
                    <input type="text" inputMode="numeric" name="cardNumber" value={form.cardNumber} onChange={onChange}
                      placeholder="카드번호" className="input-x" />
                    <input type="text" inputMode="numeric" name="cardExpiry" value={form.cardExpiry} onChange={onChange}
                      placeholder="유효기간 (MM/YY)" className="input-x" />
                  </div>
                )}
              </div>
            </div>

            {/* [설치주소] */}
            <div className="receipt-section">
              <h3 className="section-title required">* 설치주소</h3>
              <div className="field-group"><label className="field-label">우편번호</label>
                <div className="address-controls">
                  <input type="text" name="zipCode" value={form.zipCode} onChange={onChange}
                    placeholder="설치 우편번호" className="input-x" style={{ flex: 2 }} readOnly />
                  <button type="button" className="find-address-btn"
                    onClick={() => openAddressSearch((addr) => setForm(f => ({ ...f, zipCode: addr.zip, address: addr.address })))}
                  >주소검색</button>
                </div>
              </div>
              <div className="field-group"><label className="field-label">기본주소</label>
                <input type="text" name="address" value={form.address} onChange={onChange}
                  placeholder="설치 기본주소" className="input-x" readOnly style={{ background: '#f9fafb' }} />
              </div>
              <div className="field-group"><label className="field-label">상세주소 (선택입력)</label>
                <input type="text" name="detailAddress" value={form.detailAddress} onChange={onChange}
                  placeholder="상세주소 (아파트명, 호실 등)" className="input-x" />
              </div>
            </div>

            {/* [제품정보] */}
            <div className="receipt-section">
              <h3 className="section-title">제품정보</h3>
              <div className="field-group"><label className="field-label">상품명 / 모델명 검색</label>
                <div className="product-search">
                  <input type="text" placeholder="상품명 또는 모델명을 입력하세요"
                    value={searchTerm} onChange={onProductSearch} className="input-x" />
                  {searchResults.length > 0 && (
                    <div className="search-results">
                      {searchResults.map((p) => (
                        <button key={p.id} type="button" className="search-result-item"
                          onClick={() => selectProduct(p)}>
                          <span className="search-name">{p.name}</span>
                          <span className="search-model">{p.model_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {productItems.map((item, idx) => (
                <div key={idx}>
                  <ProductInfoCard item={item} itemIndex={idx}
                    showRemove={productItems.length > 1} onRemove={() => removeProductItem(idx)} />
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" className="btn btn-outline-x"
                      onClick={() => openOptionModal(idx)} style={{ fontSize: 12, padding: '6px 14px' }}>
                      {item.selectedOption ? '렌탈 옵션 변경' : '렌탤 옵션 선택'}
                    </button>
                    {item.selectedOption && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {item.selectedOption.years} / {item.selectedOption.plan_label}
                      </span>
                    )}
                  </div>
                  {item.colors && item.colors.length > 0 && idx === 0 && (
                    <ColorSelector colors={item.colors} value={item.color}
                      onChange={(c) => updateProductItem(idx, 'color', c)} />
                  )}
                </div>
              ))}

              <button type="button" onClick={addProduct} className="add-product-btn">+ 제품정보 추가</button>
            </div>

            {/* [프로모션 + 확인요청] */}
            <div className="receipt-section">
              <div className="field-group"><label className="field-label required">* 프로모션</label>
                <div className="radio-group">
                  {PROMOTION_OPTS.map((opt) => (
                    <label key={opt} className="radio-item">
                      <input type="radio" name="promotion" value={opt}
                        checked={form.promotion === opt}
                        onChange={() => setForm(f => ({ ...f, promotion: opt }))} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {form.promotion === '있음' && (
                  <input type="text" name="promotionText" value={form.promotionText} onChange={onChange}
                    placeholder="선택 가능한 프로모션을 입력하세요" className="input-x" style={{ marginTop: 8 }} />
                )}
              </div>
              <div className="field-group" style={{ marginTop: 12 }}><label className="field-label">확인요청</label>
                <div className="checkbox-grid">
                  {CHECK_REQUESTS.map((req) => (
                    <label key={req.value} className="checkbox-item">
                      <input type="checkbox" name="checkRequests" value={req.value}
                        checked={form.checkRequests.includes(req.value)} onChange={onCheckChange} />
                      <span>{req.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* [특이사항] */}
            <div className="receipt-section">
              <h3 className="section-title">특이사항</h3>
              <textarea name="notes" value={form.notes} onChange={onChange}
                placeholder="기본 문구: 가장 빠른 설치 요청"
                className="input-x" style={{ minHeight: 100, resize: 'vertical' }} />
            </div>

            {/* 저장 / 내용복사 / 접수 */}
            <div className="receipt-actions">
              <button type="button" className="btn btn-ghost-x" onClick={copyPreview}
                style={{ flex: 1, padding: '12px 16px', fontSize: 14, fontWeight: 700 }}>📋 내용 복사</button>
              <button type="button" className="btn btn-primary-x"
                style={{ flex: 2, padding: '12px 16px', fontSize: 14, fontWeight: 700 }}>💾 저장하기</button>
            </div>

            <div className="receipt-submit">
              <button type="button" className="btn btn-ghost-x"
                onClick={() => navigate('/admin/submission_list')}
                style={{ flex: 1, padding: '12px 16px', maxWidth: 140, fontSize: 14, fontWeight: 700 }}>접수 취소</button>
              <button type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    '접수를 진행하시겠습니까?\n\n' +
                    `브랜드: ${form.brand}\n` +
                    `고객명: ${form.customerName}\n` +
                    `상품명: ${productItems[0]?.productName || '-'}`
                  )
                  if (confirmed) {
                    const formEl = document.getElementById('receipt-form')
                    if (formEl) formEl.requestSubmit()
                  }
                }}
                className="btn btn-primary-x"
                style={{ flex: 2, padding: '14px 20px', fontSize: 16, fontWeight: 800 }}
                disabled={receiving}
              >{receiving ? '접수 중...' : '접수'}</button>
            </div>
          </div>

          {/* 우측 미리보기 */}
          <div className="receipt-preview">
            <div className="preview-container">
              <h3 className="preview-title">미리보기</h3>
              <pre className="preview-text">{previewText}</pre>
            </div>
          </div>
        </div>
      </form>

      {/* 렌탈 옵션 선택 모달 */}
      <RentalOptionModal
        open={optionModalOpen}
        onClose={() => setOptionModalOpen(false)}
        product={currentEditItem?.fullProduct || null}
        onConfirm={handleOptionConfirm}
      />
    </div>
  )
}
