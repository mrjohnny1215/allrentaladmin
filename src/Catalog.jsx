import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import './catalog.css'

const CATEGORIES = ['정수기', '공기청정기', '비데', '매트리스', '안마의자']
const BRANDS = ['코웨이', '청호나이스', '쿠쿠', 'SK매직', '현대큐밍', '웰스', '세스코']
const MGMTS = ['방문관리', '셀프관리']
const CONTRACTS = ['신규', '신규/후결합', '신규/동시구매', '보상', '보상/후결합', '보상/동시구매']
const YEARS = ['3년', '4년', '5년', '6년', '7년', '9년']
const PAGE = 60
const NO_IMG = '/assets/goods_image/no_image.jpg'

const won = (n) => (n ? n.toLocaleString('ko-KR') : '0')

/* ============================================================
   스마트 필터 분류 로직 (allrental-xi 스타일 이식)
   - 대상 필드: 상품명(name) / 월 렌탈료(min_monthly_fee)
   ============================================================ */
const parsePrice = (s) => parseInt(String(s || '0').replace(/[^0-9]/g, ''), 10) || 0

function extractBrand(name = '') {
  for (const b of BRANDS) if (name.includes(b)) return b
  return '기타'
}
function classifyFunc(d = '') {
  if (d.includes('얼음')) return '얼음냉온'
  if (d.includes('탄산')) return '탄산정수기'
  if (d.includes('커피')) return '커피정수기'
  if (d.includes('냉온')) return '냉온전용'
  if (d.includes('냉수')) return '냉수전용'
  if (d.includes('온수')) return '온수전용'
  return '정수전용'
}
function classifyType(d = '') {
  if (d.includes('빌트인') || d.includes('매립')) return '빌트인'
  if (d.includes('스탠드')) return '스탠드형'
  if (d.includes('하프') || d.includes('언더') || d.includes('캐비닛')) return '하프형'
  return '스탠드형'
}
function classifyMethod(d = '') {
  if (d.includes('탱크') || d.includes('저수조') || d.includes('저장')) return '탱크형'
  return '직수형'
}
function classifyPriceRange(price = 0) {
  const p = parsePrice(price)
  if (p <= 10000) return '1만원이하'
  if (p < 20000) return '1만원대'
  if (p < 30000) return '2만원대'
  if (p < 40000) return '3만원대'
  if (p <= 100000) return '4~10만원'
  return '10만원이상'
}
function classifyArea(d = '') {
  const m = d.match(/(\d+)\s*평/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (n <= 10) return '10평이하'
    if (n <= 20) return '11~20평'
    if (n <= 30) return '21~30평'
    return '31~50평'
  }
  if (d.includes('대형') || d.includes('30평') || d.includes('50평')) return '31~50평'
  return '11~20평'
}
function classifyAirFunc(d = '') {
  if (d.includes('가습')) return '가습기능'
  if (d.includes('온풍')) return '온풍기능'
  if (d.includes('제습')) return '제습기능'
  if (d.includes('펫') || d.includes('반려')) return '펫기능'
  if (d.includes('환기')) return '환기청정기'
  return '' // 일반청정기는 칩에 매칭 안 됨 → 필터에서 제외
}
function classifyMattressType(d = '') {
  if (d.includes('탑퍼')) return '탑퍼교체'
  if (d.includes('메모리')) return '메모리폼'
  if (d.includes('커버') || d.includes('원바디')) return '커버교체'
  if (d.includes('온열')) return '온열'
  if (d.includes('말총')) return '말총'
  if (d.includes('하이브리드')) return '하이브리드'
  if (d.includes('유로탑')) return '유로탑'
  if (d.includes('포켓스프링')) return '포켓스프링'
  if (d.includes('폼')) return '폼'
  if (d.includes('모션') || d.includes('마사지') || d.includes('안마') || d.includes('진동')) return '모션/마사지'
  if (d.includes('비렉스') || d.includes('엘리트') || d.includes('시그니처') || d.includes('스마트') || d.includes('모디') || d.includes('온리') || d.includes('듀얼') || d.includes('William') || d.includes('웜') || d.includes('레스티노') || d.includes('워커힐') || d.includes('디클라시') || d.includes('네스티지') || d.includes('로얄스위트') || d.includes('멜로우') || d.includes('고마르코') || d.includes('어댑트') || d.includes('헬렌') || d.includes('마제스틱') || d.includes('레인보우')) return '스프링매트리스'
  return '기타'
}

/* ============ 스마트 필터 칩 버튼 그룹 ============ */
function FilterChips({ label, options, value, onChange }) {
  return (
    <div className="filter-chips">
      <span className="filter-label">{label}</span>
      <button onClick={() => onChange('all')}
        className={`fchip ${value === 'all' ? 'on' : ''}`}>전체</button>
      {options.map((opt) => (
        <button key={opt} onClick={() => onChange(opt)}
          className={`fchip ${value === opt ? 'on' : ''}`}>{opt}</button>
      ))}
    </div>
  )
}

/* ============ 카드 썸네일: 다중 이미지 자동 순환 (GIF 효과) ============ */
function CardSlideshow({ images, alt, active }) {
  const list = images && images.length ? images.slice(0, 6) : [NO_IMG]
  const [idx, setIdx] = useState(0)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (list.length < 2) return
    const delay = hover || active ? 900 : 1800
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), delay)
    return () => clearInterval(t)
  }, [list.length, hover, active])

  return (
    <div
      className="pcard-thumb"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {list.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={`${alt} ${i + 1}`}
          className={i === idx ? 'on' : ''}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          onError={(e) => { e.currentTarget.src = NO_IMG }}
        />
      ))}
      {list.length > 1 && (
        <>
          <span className="badge-imgs">📷 {images.length}</span>
          <div className="thumb-dots">
            {list.map((_, i) => <i key={i} className={i === idx ? 'on' : ''} />)}
          </div>
        </>
      )}
    </div>
  )
}

/* ============ 상세: 대형 갤러리 ============ */
function Gallery({ images, name }) {
  const list = images && images.length ? images : [NO_IMG]
  const [i, setI] = useState(0)
  useEffect(() => { setI(0) }, [images])
  const go = (d) => setI((v) => (v + d + list.length) % list.length)

  return (
    <div>
      <div className="gal-main">
        <img src={list[i]} alt={name}
          onError={(e) => { e.currentTarget.src = NO_IMG }} />
        {list.length > 1 && (
          <>
            <button className="gal-nav prev" onClick={() => go(-1)} aria-label="이전">◀</button>
            <button className="gal-nav next" onClick={() => go(1)} aria-label="다음">▶</button>
            <span className="gal-counter">{i + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="gal-thumbs">
          {list.map((src, k) => (
            <button key={src + k} className={k === i ? 'on' : ''} onClick={() => setI(k)}>
              <img src={src} alt="" loading="lazy"
                onError={(e) => { e.currentTarget.src = NO_IMG }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============ 인터랙티브 렌탈료/수수료 계산기 ============ */
function Calculator({ matrix }) {
  const avail = useMemo(() => {
    const m = { mgmt: new Set(), contract: new Set(), years: new Set() }
    matrix.forEach((r) => {
      if (r.mgmt) m.mgmt.add(r.mgmt)
      m.contract.add(r.contract)
      m.years.add(r.years)
    })
    return m
  }, [matrix])

  const [mgmt, setMgmt] = useState('')
  const [contract, setContract] = useState('')
  const [years, setYears] = useState('')

  useEffect(() => {
    const first = matrix[0]
    setMgmt(first?.mgmt || '')
    setContract(first?.contract || '')
    setYears(first?.years || '')
  }, [matrix])

  const rows = useMemo(
    () => matrix.filter((r) =>
      (!mgmt || r.mgmt === mgmt) &&
      (!contract || r.contract === contract) &&
      (!years || r.years === years)),
    [matrix, mgmt, contract, years]
  )
  const hit = rows[0]

  const canPick = (kind, val) => matrix.some((r) =>
    (kind === 'mgmt' ? r.mgmt === val : (!mgmt || r.mgmt === mgmt)) &&
    (kind === 'contract' ? r.contract === val : (!contract || r.contract === contract)) &&
    (kind === 'years' ? r.years === val : (!years || r.years === years)))

  const Seg = ({ cap, opts, val, set, kind, cls = '' }) => (
    <div className="calc-row">
      <span className="cap">{cap}</span>
      <div className={`seg ${cls}`}>
        {opts.filter((o) => avail[kind].has(o)).map((o) => (
          <button key={o} className={val === o ? 'on' : ''} disabled={!canPick(kind, o)}
            onClick={() => set(o)}>{o}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="calc">
      <h3>🧮 렌탈료 / 수수료 계산기</h3>
      <Seg cap="관리 방식" opts={MGMTS} val={mgmt} set={setMgmt} kind="mgmt" />
      <Seg cap="계약 유형" opts={CONTRACTS} val={contract} set={setContract} kind="contract" />
      <Seg cap="약정 기간" opts={YEARS} val={years} set={setYears} kind="years" cls="years" />

      <div className="result-box">
        {hit ? (
          <>
            <div className="result-line fee">
              <span className="k">월 렌탈료</span>
              <span className="v">{won(hit.monthly_fee)}<small>원</small></span>
            </div>
            <div className="result-line comm">
              <span className="k">지급 수수료 (사은 혜택)</span>
              <span className="v">{won(hit.commission)}<small>원</small></span>
            </div>
            <div className="result-meta">
              {hit.plan_label || `${hit.years} ${hit.contract}`}
              {hit.mgmt_cycle ? ` · 관리주기 ${hit.mgmt_cycle}` : ''}
              {hit.rule_raw ? ` · 규정 ${hit.rule_raw}` : ''}
              {rows.length > 1 ? ` · 동일조건 ${rows.length}건 중 대표` : ''}
            </div>
          </>
        ) : (
          <div className="result-empty">선택한 조건의 렌탈료 정보가 없습니다.</div>
        )}
      </div>
    </div>
  )
}

/* ============ 상세 섹션 ============ */
function DetailSection({ p }) {
  if (!p) return null
  const sp = p.selling_points || { points: [], filters: [] }
  const promo = p.promotions || {}
  return (
    <div className="detail-wrap">
      <div className="detail-inner">
        <span className="detail-eyebrow">{p.brand} · {p.category}</span>
        <h2 className="detail-title">{p.name}</h2>
        <p className="detail-sub">
          {p.model_code || '모델명 미등록'}
          {promo.updated ? ` · 업데이트 ${promo.updated}` : ''}
        </p>

        <div className="detail-cols">
          <div>
            <Gallery images={p.images} name={p.name} />
            {sp.points?.length > 0 && (
              <div className="info-block">
                <h4>✨ 특장점</h4>
                <div className="pt-list">
                  {sp.points.map((t, i) => <span key={i}>{t}</span>)}
                </div>
              </div>
            )}
            {sp.filters?.length > 0 && (
              <div className="info-block">
                <h4>🧪 필터 / 관리 주기</h4>
                <ul className="filter-list">
                  {sp.filters.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div>
            <Calculator matrix={p.pricing_matrix || []} />

            <div className="info-block">
              <h4>📐 제품 스펙</h4>
              <table className="spec-table">
                <tbody>
                  <tr><th>브랜드</th><td>{p.brand}</td></tr>
                  <tr><th>카테고리</th><td>{p.category}{p.product_group ? ` (${p.product_group})` : ''}</td></tr>
                  <tr><th>모델명</th><td>{p.model_code || '-'}</td></tr>
                  {p.specs?.capacity && <tr><th>용량</th><td>{p.specs.capacity}</td></tr>}
                  {p.specs?.size && <tr><th>규격</th><td>{p.specs.size}</td></tr>}
                  <tr><th>최저 월료</th><td><b>{won(p.min_monthly_fee)}원</b> 부터</td></tr>
                  <tr><th>최대 수수료</th><td>{won(p.max_commission)}원</td></tr>
                </tbody>
              </table>
            </div>

            {p.colors?.length > 0 && (
              <div className="info-block">
                <h4>🎨 색상 ({p.colors.length})</h4>
                <div className="color-list">
                  {p.colors.map((c) => <span key={c}>{c}</span>)}
                </div>
              </div>
            )}

            {(promo.plan?.product || promo.monthly) && (
              <div className="info-block">
                <h4>🎁 프로모션 {promo.updated ? `(${promo.updated} 기준)` : ''}</h4>
                <pre className="promo-pre">
                  {[promo.plan?.product, promo.plan?.['3년'], promo.plan?.['5년'], promo.monthly]
                    .filter(Boolean).join('\n\n')}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============ 메인 카탈로그 ============ */
export default function Catalog() {
  const [all, setAll] = useState(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [brand, setBrand] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [sel, setSel] = useState(null)
  // 스마트 필터 상태 (allrental-xi 스타일)
  const [brandFilter, setBrandFilter] = useState('all')
  const [funcFilter, setFuncFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [airFuncFilter, setAirFuncFilter] = useState('all')
  const [mattressTypeFilter, setMattressTypeFilter] = useState('all')
  // 수수료 ON/OFF (플로팅 버튼)
  const [commissionOn, setCommissionOn] = useState(false)
  const detailRef = useRef(null)
  const veilRef = useRef(null)

  useEffect(() => {
    fetch('/data/products.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then(setAll)
      .catch((e) => setErr(String(e)))
  }, [])

  const list = useMemo(() => {
    if (!all) return []
    const kw = q.trim().toLowerCase()
    return all.filter((p) => {
      if (cat && p.category !== cat) return false
      // 브랜드: 툴바 브랜드 칩 or 스마트 필터 렌탈사
      const b = extractBrand(p.name)
      const brandOk = brand ? p.brand === brand : true
      const brandFilterOk = brandFilter === 'all' ? true : b === brandFilter
      if (!brandOk || !brandFilterOk) return false
      if (kw) {
        const hay = `${p.name} ${p.model_code} ${p.brand} ${(p.tags || []).join(' ')}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      // 세부 스마트 필터
      const name = p.name || ''
      if (cat === '정수기') {
        if (funcFilter !== 'all' && classifyFunc(name) !== funcFilter) return false
        if (typeFilter !== 'all' && classifyType(name) !== typeFilter) return false
        if (methodFilter !== 'all' && classifyMethod(name) !== methodFilter) return false
        if (priceFilter !== 'all' && classifyPriceRange(p.min_monthly_fee) !== priceFilter) return false
      } else if (cat === '공기청정기') {
        if (areaFilter !== 'all' && classifyArea(name) !== areaFilter) return false
        if (airFuncFilter !== 'all' && classifyAirFunc(name) !== airFuncFilter) return false
        if (priceFilter !== 'all' && classifyPriceRange(p.min_monthly_fee) !== priceFilter) return false
      } else if (cat === '비데') {
        if (priceFilter !== 'all' && classifyPriceRange(p.min_monthly_fee) !== priceFilter) return false
      } else if (cat === '매트리스') {
        if (mattressTypeFilter !== 'all' && classifyMattressType(name) !== mattressTypeFilter) return false
        if (priceFilter !== 'all' && classifyPriceRange(p.min_monthly_fee) !== priceFilter) return false
      } else if (cat === '안마의자') {
        if (priceFilter !== 'all' && classifyPriceRange(p.min_monthly_fee) !== priceFilter) return false
      }
      return true
    })
  }, [all, q, cat, brand, brandFilter, funcFilter, typeFilter, methodFilter, priceFilter, areaFilter, airFuncFilter, mattressTypeFilter])

  useEffect(() => { setLimit(PAGE) }, [q, cat, brand, brandFilter, funcFilter, typeFilter, methodFilter, priceFilter, areaFilter, airFuncFilter, mattressTypeFilter])

  // 모달 열기: 별도 창
  const open = useCallback((p) => setSel(p), [])
  const close = useCallback(() => setSel(null), [])

  // ESC 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!sel) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [sel, close])

  // 카테고리/브랜드 전환 시 세부 필터 초기화
  const resetFilters = useCallback(() => {
    setBrandFilter('all'); setFuncFilter('all'); setTypeFilter('all'); setMethodFilter('all')
    setPriceFilter('all'); setAreaFilter('all'); setAirFuncFilter('all'); setMattressTypeFilter('all')
  }, [])

  if (err) {
    return (
      <div className="splash"><div className="box">
        <div className="logo">!</div>
        <p>데이터 로드 실패: {err}</p>
      </div></div>
    )
  }
  if (!all) {
    return (
      <div className="splash"><div className="box">
        <div className="logo">A</div>
        <p>상품 데이터를 불러오는 중...</p>
      </div></div>
    )
  }

  const shown = list.slice(0, limit)

  return (
    <div className="cat-root">
      <header className="cat-header">
        <h1>ALL렌탈 <span className="count">{list.length.toLocaleString()}개</span></h1>
        <div className="sub">PREMIUM RENTAL</div>
      </header>

      <div className="cat-toolbar">
        <input className="cat-search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="상품명 · 모델명 · 태그 검색 (예: 아이콘3, CHP-7220N)" />
        <div className="chip-row">
          <span className="label">분류</span>
          <button className={`chip ${!cat ? 'active' : ''}`} onClick={() => { setCat(''); resetFilters() }}>전체</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={`chip ${cat === c ? 'active' : ''}`}
              onClick={() => { setCat(cat === c ? '' : c); resetFilters() }}>{c}</button>
          ))}
        </div>
        <div className="chip-row">
          <span className="label">브랜드</span>
          <button className={`chip ${!brand ? 'active' : ''}`} onClick={() => setBrand('')}>전체</button>
          {BRANDS.map((b) => (
            <button key={b} className={`chip ${brand === b ? 'active' : ''}`}
              onClick={() => setBrand(brand === b ? '' : b)}>{b}</button>
          ))}
        </div>
      </div>

      {/* ===== 스마트 필터 (allrental-xi 스타일) ===== */}
      <div className="smart-filter-box">
        <div className="smart-filter-title">🔍 스마트 필터</div>
        <FilterChips label="렌탈사" options={BRANDS} value={brandFilter} onChange={setBrandFilter} />
        {cat === '정수기' && (
          <>
            <FilterChips label="기능" options={['냉수전용', '냉온전용', '얼음냉온', '정수전용']} value={funcFilter} onChange={setFuncFilter} />
            <FilterChips label="타입" options={['빌트인', '스탠드형', '하프형']} value={typeFilter} onChange={setTypeFilter} />
            <FilterChips label="방식" options={['탱크형', '직수형']} value={methodFilter} onChange={setMethodFilter} />
            <FilterChips label="렌탈료" options={['1만원이하', '1만원대', '2만원대', '3만원대', '4~10만원']} value={priceFilter} onChange={setPriceFilter} />
          </>
        )}
        {cat === '공기청정기' && (
          <>
            <FilterChips label="평형" options={['10평이하', '11~20평', '21~30평', '31~50평']} value={areaFilter} onChange={setAreaFilter} />
            <FilterChips label="기능" options={['가습기능', '온풍기능', '제습기능', '펫기능', '환기청정기']} value={airFuncFilter} onChange={setAirFuncFilter} />
            <FilterChips label="렌탈료" options={['1만원이하', '1만원대', '2만원대', '3만원대', '4~10만원']} value={priceFilter} onChange={setPriceFilter} />
          </>
        )}
        {cat === '비데' && (
          <FilterChips label="렌탈료" options={['1만원이하', '1만원대', '2만원대', '3만원대', '4~10만원']} value={priceFilter} onChange={setPriceFilter} />
        )}
        {cat === '매트리스' && (
          <>
            <FilterChips label="타입" options={['탑퍼교체', '메모리폼', '커버교체', '온열', '말총', '하이브리드', '유로탑', '포켓스프링', '폼', '모션/마사지', '스프링매트리스']} value={mattressTypeFilter} onChange={setMattressTypeFilter} />
            <FilterChips label="렌탈료" options={['1만원대', '2만원대', '3만원대', '4~10만원', '10만원이상']} value={priceFilter} onChange={setPriceFilter} />
          </>
        )}
        {cat === '안마의자' && (
          <FilterChips label="렌탈료" options={['1만원이하', '1만원대', '2만원대', '3만원대', '4~10만원', '10만원이상']} value={priceFilter} onChange={setPriceFilter} />
        )}
      </div>

      {shown.length === 0 ? (
        <div className="empty-state">조건에 맞는 상품이 없습니다.</div>
      ) : (
        <>
          <div className="cat-grid">
            {shown.map((p) => (
              <button key={p.id} className={`pcard ${sel?.id === p.id ? 'selected' : ''}`}
                onClick={() => open(p)}>
                <CardSlideshow images={p.images} alt={p.name} active={sel?.id === p.id} />
                {p.promotions?.plan?.product && <span className="badge-promo">PROMO</span>}
                <div className="pcard-body">
                  <div className="pcard-brand">{p.brand}</div>
                  <div className="pcard-name">{p.name}</div>
                  <div className="pcard-model">{p.model_code || ' '}</div>
                  <div className={`pcard-fee ${commissionOn ? 'is-commission' : 'is-fee'}`}>
                    <span className="tag">{commissionOn ? '수수료' : '월'}</span>
                    <span className="val">{won(commissionOn ? p.max_commission : p.min_monthly_fee)}</span>
                    <span className="won">{commissionOn ? '원' : '원~'}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {limit < list.length && (
            <button className="load-more" onClick={() => setLimit((v) => v + PAGE)}>
              더 보기 ({list.length - limit}개 남음)
            </button>
          )}
        </>
      )}

      <div ref={detailRef} aria-hidden={!!sel}>
        {/* 별도 창(모달)으로 표시 — 페이지 스크롤 없이 오버레이 */}
        {sel && (
          <div className="modal-veil" ref={veilRef}
            onClick={(e) => { if (e.target === veilRef.current) close() }}>
            <div className="modal-card">
              <button className="modal-close" onClick={close} aria-label="닫기">×</button>
              <div className="modal-hint">
                <span>📋 상품 상세</span>
                <b>{sel.brand} · {sel.name}</b>
              </div>
              <div className="modal-body">
                <DetailSection p={sel} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== 우측 하단 플로팅: 수수료 ON/OFF (위) + 맨 위로 가기 (아래) ===== */}
      <div className="float-actions">
        <button
          className={`float-btn fee-btn ${commissionOn ? 'on' : ''}`}
          onClick={() => setCommissionOn((v) => !v)}
          title={commissionOn ? '수수료 표시 중 — 클릭해 끄기' : '수수료 숨김 — 클릭해 켜기'}
        >
          {commissionOn ? '수수료 ON' : '수수료 OFF'}
        </button>
        <button
          className="float-btn top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="위로 올라가기"
        >
          ↑ 맨위로
        </button>
      </div>
    </div>
  )
}
