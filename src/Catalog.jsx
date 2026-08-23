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

/* ============ 카드 썸네일: 다중 이미지 자동 순환 (GIF 효과) ============ */
function CardSlideshow({ images, alt, active }) {
  const list = images && images.length ? images.slice(0, 6) : [NO_IMG]
  const [idx, setIdx] = useState(0)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (list.length < 2) return
    // 선택/호버 시 빠르게, 평시엔 1.8초 간격 자동 순환
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

  // 상품이 바뀌면 유효한 첫 조합으로 자동 초기화
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

  // 조합 가능 여부 (선택 불가 옵션 비활성화)
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
  const detailRef = useRef(null)

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
      if (brand && p.brand !== brand) return false
      if (kw) {
        const hay = `${p.name} ${p.model_code} ${p.brand} ${(p.tags || []).join(' ')}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [all, q, cat, brand])

  useEffect(() => { setLimit(PAGE) }, [q, cat, brand])

  const pick = useCallback((p) => {
    setSel(p)
    // 페이지 이동 없이 하단 상세 섹션으로 부드럽게 스크롤
    requestAnimationFrame(() => {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    })
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
          <button className={`chip ${!cat ? 'active' : ''}`} onClick={() => setCat('')}>전체</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={`chip ${cat === c ? 'active' : ''}`}
              onClick={() => setCat(cat === c ? '' : c)}>{c}</button>
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

      {shown.length === 0 ? (
        <div className="empty-state">조건에 맞는 상품이 없습니다.</div>
      ) : (
        <>
          <div className="cat-grid">
            {shown.map((p) => (
              <button key={p.id} className={`pcard ${sel?.id === p.id ? 'selected' : ''}`}
                onClick={() => pick(p)}>
                <CardSlideshow images={p.images} alt={p.name} active={sel?.id === p.id} />
                {p.promotions?.plan?.product && <span className="badge-promo">PROMO</span>}
                <div className="pcard-body">
                  <div className="pcard-brand">{p.brand}</div>
                  <div className="pcard-name">{p.name}</div>
                  <div className="pcard-model">{p.model_code || '\u00a0'}</div>
                  <div className="pcard-fee">
                    <span className="from">월</span>
                    <span className="val">{won(p.min_monthly_fee)}</span>
                    <span className="won">원~</span>
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

      <div ref={detailRef}>
        {sel && <DetailSection p={sel} />}
      </div>
    </div>
  )
}
