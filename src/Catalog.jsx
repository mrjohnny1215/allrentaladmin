import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import './catalog.css'
import { KAKAO_CHANNEL_URL, COMPANY } from './config'

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

function extractBrand(p = {}) {
  // name 필드엔 브랜드명이 없는 경우가 많아 brand 필드를 우선 사용
  const b = p.brand || ''
  if (BRANDS.includes(b)) return b
  // name에서 추론 시도 (fallback)
  for (const x of BRANDS) if ((p.name || '').includes(x)) return x
  return b || '기타'
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
        <div className="thumb-dots">
          {list.map((_, i) => <i key={i} className={i === idx ? 'on' : ''} />)}
        </div>
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
function Calculator({ matrix, colors = [], commissionOn, onPick, discount = 0, setDiscount }) {
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
  const [color, setColor] = useState('')

  useEffect(() => {
    const first = matrix[0]
    setMgmt(first?.mgmt || '')
    setContract(first?.contract || '')
    setYears(first?.years || '')
    setColor((prev) => prev || colors[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Seg cap="관리 방식" opts={MGMTS} val={mgmt} set={(o) => { setMgmt(o); onPick && onPick({ mgmt: o, contract, years }) }} kind="mgmt" />
      <Seg cap="계약 유형" opts={CONTRACTS} val={contract} set={(o) => { setContract(o); onPick && onPick({ mgmt, contract: o, years }) }} kind="contract" />
      <Seg cap="약정 기간" opts={YEARS} val={years} set={(o) => { setYears(o); onPick && onPick({ mgmt, contract, years: o }) }} kind="years" cls="years" />

      <div className="calc-row discount-row">
        <span className="cap">카드할인</span>
        <div className="seg discount-ctrl">
          <button className="disc-btn" onClick={() => setDiscount((d) => Math.max(0, d - 1000))} type="button">▼</button>
          <input type="number" inputMode="numeric" value={discount} onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value || '0', 10)))} />
          <button className="disc-btn" onClick={() => setDiscount((d) => d + 1000)} type="button">▲</button>
        </div>
      </div>

      {colors.length > 0 && (
        <div className="calc-row">
          <span className="cap">색상</span>
          <div className="seg colors">
            {colors.map((c) => (
              <button key={c} className={`color-chip ${color === c ? 'on' : ''}`}
                onClick={() => setColor(c)}>{c}</button>
            ))}
          </div>
        </div>
      )}

      <div className="result-box">
        {hit ? (
          <>
            {commissionOn && (
              <div className="result-line comm">
                <span className="k">지급 수수료 (사은 혜택)</span>
                <span className="v">{won(hit.commission)}<small>원</small></span>
              </div>
            )}
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

/* ============ 상세 섹션 (쇼핑몰 레퍼런스 스타일 전면 개편) ============ */
const BRAND_EN = {
  '코웨이': 'coway', '청호나이스': 'chungho', '쿠쿠': 'cuckoo', 'SK매직': 'skmagic',
  '현대큐밍': 'hyundai', '웰스': 'wells', '세스코': 'sesco',
}
const CATEGORY_EN = {
  '정수기': 'Water Purifier', '공기청정기': 'Air Purifier', '비데': 'Bidet',
  '매트리스': 'Mattress', '안마의자': 'Massage Chair',
}

function DetailSection({ p, commissionOn, setCommissionOn, scrollRef }) {
  if (!p) return null
  const sp = p.selling_points || { points: [], filters: [] }
  const promo = p.promotions || {}
  const matrix = p.pricing_matrix || []
  // 계산기 선택 상태를 상단 price-card와 공유
  const [selMgmt, setSelMgmt] = useState('')
  const [selContract, setSelContract] = useState('')
  const [selYears, setSelYears] = useState('')
  const [discount, setDiscount] = useState(0)
  useEffect(() => {
    const f = matrix[0]
    setSelMgmt(f?.mgmt || '')
    setSelContract(f?.contract || '')
    setSelYears(f?.years || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix])
  const matched = matrix.find((r) =>
    (!selMgmt || r.mgmt === selMgmt) &&
    (!selContract || r.contract === selContract) &&
    (!selYears || r.years === selYears)) || matrix[0] || {}
  const effCommission = matched.commission ?? p.max_commission
  const effMonthly = matched.monthly_fee ?? p.min_monthly_fee
  const brandEn = BRAND_EN[p.brand] || p.brand
  const catEn = CATEGORY_EN[p.category] || p.category

  const rawDescImgs = Array.isArray(p.detail_description_images) ? p.detail_description_images : []
  const descImgs = rawDescImgs.filter((src) => {
    const s = String(src || '')
    if (!s) return false
    const lower = s.toLowerCase()
    if (/(promo|banner|gift|event|eventbanner|coupon|이벤트|사은품|증정|쿠폰)/.test(lower)) return false
    if (/(goods_image|item_product|editor|rentalworld|speedycdn|tlpartner)/.test(lower)) return true
    return true
  })

  const [tableOpen, setTableOpen] = useState(false)
  const [cardModal, setCardModal] = useState(false)
  const [cardImg, setCardImg] = useState(null)

  const BRAND_CARD = {
    '코웨이': '/pages/cards/coway.png',
    '청호나이스': '/pages/cards/chungho.png',
    'SK매직': '/pages/cards/sk.png',
    '쿠쿠': '/pages/cards/cuckoo.png',
    '웰스': '/pages/cards/wells.png',
    'LG': '/pages/cards/lg.png',
    '현대큐밍': '/pages/cards/hyundai.png',
    '세스코': '/pages/cards/sesko.png'
  }
  const currentBrand = p?.brand || ''
  const currentCardSrc = BRAND_CARD[currentBrand] || null
  const currentCardName = currentBrand || '제휴카드'

  const rep = matrix[0] || {}
  return (
    <div className="detail-wrap">
      <div className="detail-inner">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>HOME</a>
          <span>›</span>
          <a>{catEn}</a>
          <span>›</span>
          <a>{p.category}</a>
          <span>›</span>
          <span className="cur">[{p.brand}] {p.name}</span>
        </nav>

        <div className="detail-cols">
          {/* 좌: 대표 갤러리만 */}
          <div>
            <Gallery images={p.images} name={p.name} />
          </div>

          {/* 우: 메타 + 가격카드 + 옵션 + 매트릭스 */}
          <div>
            <div className="brand-logo">{p.brand}</div>
            <h2 className="detail-title">{p.name}</h2>
            <div className="meta-row">
              <span><b>브랜드</b> {p.brand}</span>
              <span><b>모델명</b> {p.model_code || '-'}</span>
              <span><b>제품종류</b> {p.category}{p.product_group ? ` (${p.product_group})` : ''}</span>
              <span><b>AS기간</b> 렌탈기간내</span>
            </div>

            <div className="price-card">
              <div className="pc-line">
                <span className="pc-k">월 렌탈료</span>
                <span className="pc-v">{won(effMonthly)}<small>원</small></span>
              </div>
              {discount > 0 && (
                <div className="pc-line disc">
                  <span className="pc-k">할인적용</span>
                  <span className="pc-v red">{won(Math.max(0, effMonthly - discount))}<small>원</small></span>
                </div>
              )}
              {commissionOn && (
                <div className="pc-line comm">
                  <div>
                    <span className="pc-k">지급 수수료 (사은 혜택)</span>
                    <span className="pc-sub">
                      {[selYears, selContract, selMgmt].filter(Boolean).join(' · ') || '기본 조건'}
                    </span>
                  </div>
                  <span className="pc-v green">{won(effCommission)}<small>원</small></span>
                </div>
              )}
            </div>

            <Calculator matrix={matrix} colors={p.colors || []} commissionOn={commissionOn}
              discount={discount} setDiscount={setDiscount}
              onPick={({ mgmt, contract, years }) => { setSelMgmt(mgmt); setSelContract(contract); setSelYears(years) }} />

            {(promo.plan?.product || promo.monthly) && (
              <div className="promo-banner">
                <div className="pb-title">🎁 진행 중인 프로모션</div>
                <pre className="pb-body">{[promo.plan?.product, promo.monthly].filter(Boolean).join('\n')}</pre>
              </div>
            )}

            <div className="aff-card">
              <div className="aff-thumb">CARD</div>
              <div className="aff-info">
                <div className="aff-name">제휴카드 안내</div>
                <div className="aff-desc">렌탈료 할인 및 무이자 혜택을 확인하세요.</div>
              </div>
              <button className="aff-more" onClick={() => setCardModal(true)}>자세히 보기</button>
            </div>

            {matrix.length > 0 && (
              <div className="info-block">
                <h4>📋 {p.name} 렌탈료 및 프로모션</h4>
                <div className={`table-scroll ${tableOpen ? '' : 'collapsed'}`}>
                  <table className="matrix-table">
                    <thead>
                      <tr><th>관리방법</th><th>관리주기</th><th>약정기간</th><th>월 렌탈료</th><th className={!commissionOn ? 'hide' : ''}>수수료</th></tr>
                    </thead>
                    <tbody>
                      {matrix.map((r, i) => (
                        <tr key={i}>
                          <td>{r.mgmt || '-'}</td>
                          <td>{r.mgmt_cycle || '-'}</td>
                          <td>{r.years || '-'}</td>
                          <td><b>{won(r.monthly_fee)}원</b></td>
                          <td className={!commissionOn ? 'hide' : ''}>{won(r.commission)}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="table-toggle" onClick={() => setTableOpen((v) => !v)}>
                  {tableOpen ? '접기 ▲' : `자세히 보기 (${matrix.length}개 약정) ▼`}
                </button>
              </div>
            )}

            {cardModal && (
              <div className="modal-veil card-modal-veil" onClick={(e) => { if (e.target === e.currentTarget) setCardModal(false) }}>
                <div className="card-modal">
                  <div className="card-modal-head">
                    <span>제휴카드 혜택</span>
                    <button className="card-modal-close" onClick={() => setCardModal(false)}>×</button>
                  </div>
                  <div className="card-modal-body">
                    <p>아래 {currentCardName} 제휴카드 혜택을 확인하세요.</p>
                    {currentCardSrc ? (
                      <div className="card-brand-detail">
                        <img src={currentCardSrc} alt={currentCardName} />
                      </div>
                    ) : (
                      <div className="fallback-msg">해당 브랜드의 제휴카드 이미지가 준비 중입니다.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단: 상세 설명 본문 이미지 */}
        {sp.points?.length > 0 && (
          <div className="info-block">
            <h4>✨ 특장점</h4>
            <div className="pt-list">{sp.points.map((t, i) => <span key={i}>{t}</span>)}</div>
          </div>
        )}
        {sp.filters?.length > 0 && (
          <div className="info-block">
            <h4>🧪 필터 / 관리 주기</h4>
            <ul className="filter-list">{sp.filters.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        )}
        {descImgs.length > 0 && (
          <div className="detail-desc">
            {descImgs.map((src, i) => (
              <img key={i} src={src} alt={`${p.name} 상세 ${i + 1}`} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ))}
          </div>
        )}

        <a className="kakao-cta" href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
          <img className="cta-kakao-ico" src="/images/kakao-icon.png" alt="카카오톡" />
          <span className="cta-txt">카톡 상담신청</span>
        </a>

        {/* 우측 하단 플로팅 버튼 3개 (상세 모달용) */}
        <div className="detail-fab-wrap">
          <a className="detail-fab fab-kakao" href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" title="카카오톡 상담">
            <img className="fab-kakao-ico" src="/images/kakao-icon.png" alt="카카오톡" />
          </a>
          <button className={`detail-fab fab-fee ${commissionOn ? 'on' : ''}`} onClick={() => setCommissionOn && setCommissionOn((v) => !v)} title={commissionOn ? '수수료 표시 중 (클릭 시 숨김)' : '숨김 중 (클릭 시 표시)'}>
            <span className="fab-ico fab-fee-txt">{commissionOn ? 'on' : 'off'}</span>
            <span className="fab-txt">on/off</span>
          </button>
          <button className="detail-fab fab-top" onClick={() => { if (scrollRef && scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }} title="맨 위로">
            <span className="fab-ico">↑</span>
            <span className="fab-txt">위로</span>
          </button>
        </div>

        <footer className="site-footer">
          <div className="foot-row"><b>{COMPANY.name}</b> · {COMPANY.phone}</div>
          <div className="foot-row">{COMPANY.address}</div>
          <div className="foot-row copy">© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</div>
        </footer>
      </div>
    </div>
  )
}

/* ============ 메인 카탈로그 ============ */
export default function Catalog() {
  const [all, setAll] = useState(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(CATEGORIES[0])
  const [brand, setBrand] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [sel, setSel] = useState(null)
  // 스마트 필터 상태 (allrental-xi 스타일)
  const [brandFilter, setBrandFilter] = useState(BRANDS[0])
  const [funcFilter, setFuncFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [airFuncFilter, setAirFuncFilter] = useState('all')
  const [mattressTypeFilter, setMattressTypeFilter] = useState('all')
  // 수수료 ON/OFF (플로팅 버튼)
  const [commissionOn, setCommissionOn] = useState(false)
  // 정렬 (수수료 많은순 기본)
  const [sort, setSort] = useState('commission_desc')
  const detailRef = useRef(null)
  const veilRef = useRef(null)
  const modalBodyRef = useRef(null)

  useEffect(() => {
    fetch('/data/products.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then(setAll)
      .catch((e) => setErr(String(e)))
  }, [])

  const list = useMemo(() => {
    if (!all) return []
    const kw = q.trim().toLowerCase()
    const filtered = all.filter((p) => {
      if (cat && p.category !== cat) return false
      // 브랜드: 스마트 필터 렌탈사
      const b = extractBrand(p)
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
    const sorted = [...filtered]
    if (sort === 'commission_desc') sorted.sort((a, b) => (b.max_commission || 0) - (a.max_commission || 0))
    else if (sort === 'price_desc') sorted.sort((a, b) => (b.min_monthly_fee || 0) - (a.min_monthly_fee || 0))
    else if (sort === 'price_asc') sorted.sort((a, b) => (a.min_monthly_fee || 0) - (b.min_monthly_fee || 0))
    else if (sort === 'latest') sorted.reverse()
    return sorted
  }, [all, q, cat, brand, brandFilter, funcFilter, typeFilter, methodFilter, priceFilter, areaFilter, airFuncFilter, mattressTypeFilter, sort])

  useEffect(() => { setLimit(PAGE) }, [q, cat, brand, brandFilter, funcFilter, typeFilter, methodFilter, priceFilter, areaFilter, airFuncFilter, mattressTypeFilter, sort])

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
      <div className="splash">
        <div className="box splash-anim">
          <div className="splash-stage">
            <div className="splash-ring splash-ring-1" />
            <div className="splash-ring splash-ring-2" />
            <div className="splash-shine" />
            <svg className="splash-logo" viewBox="0 0 100 100" width="76" height="76" aria-hidden="true">
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde68a"/>
                  <stop offset="45%" stopColor="#f59e0b"/>
                  <stop offset="100%" stopColor="#d97706"/>
                </linearGradient>
                <linearGradient id="sg2" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fbbf24"/>
                  <stop offset="100%" stopColor="#fcd34d"/>
                </linearGradient>
              </defs>
              <path fill="none" stroke="url(#sg)" strokeWidth="6.5" strokeLinecap="round"
                d="M28 36 C12 36 12 64 28 64 C44 64 44 36 28 36 C12 36 12 64 28 64 M72 36 C56 36 56 64 72 64 C88 64 88 36 72 36 C56 36 56 64 72 64"/>
              <circle cx="50" cy="50" r="3" fill="url(#sg2)" />
            </svg>
          </div>
          <div className="splash-brand">ALLRENTAL</div>
          <div className="splash-bar"><span /></div>
          <p>렌탈 상담 포털을 준비하는 중...</p>
        </div>
      </div>
    )
  }

  const shown = list.slice(0, limit)

  return (
    <div className="cat-root">
      <header className="cat-header">
        <h1>ALL렌탈</h1>
        <div className="sub">PREMIUM RENTAL</div>
      </header>

      <div className="cat-toolbar">
        <input className="cat-search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="상품명 · 모델명 · 태그 검색 (예: 아이콘3, CHP-7220N)" />
        <select className="cat-sort" value={sort} onChange={(e) => setSort(e.target.value)}
          aria-label="정렬 기준">
          <option value="commission_desc">판매량 많은순</option>
          <option value="price_desc">렌탈료 높은순</option>
          <option value="price_asc">렌탈료 낮은순</option>
          <option value="latest">최신순</option>
        </select>
      </div>

      {/* ===== 스마트 필터 (allrental-xi 스타일) ===== */}
      <div className="smart-filter-box">
        <div className="smart-filter-title">🔍 스마트 필터</div>
        <FilterChips label="분류" options={CATEGORIES} value={cat === '' ? 'all' : cat} onChange={(v) => { setCat(v === 'all' ? '' : v); resetFilters() }} />
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
                  <div className="pcard-fee is-fee">
                    <span className="tag">월</span>
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

      <div ref={detailRef} aria-hidden={!!sel}>
        {/* 별도 창(모달)으로 표시 — 페이지 스크롤 없이 오버레이 */}
        {sel && (
          <div className="modal-veil" ref={veilRef}
            onClick={(e) => { if (e.target === veilRef.current) close() }}>
            <div className="modal-card fullscreen">
              <div className="modal-topbar">
                <button className="modal-back" onClick={close} aria-label="뒤로가기">← 뒤로</button>
                <div className="modal-topbar-title">{sel.brand} · {sel.name}</div>
                <button className="modal-close" onClick={close} aria-label="닫기">×</button>
              </div>
              <div className="modal-body" ref={modalBodyRef}>
                <DetailSection p={sel} commissionOn={commissionOn} setCommissionOn={setCommissionOn} scrollRef={modalBodyRef} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== 우측 하단 플로팅 버튼 (노출 분기) ===== */}
      <div className="float-actions">
        {sel ? (
          <>
            <button
              className="fab fab-kakao"
              onClick={() => window.open(KAKAO_CHANNEL_URL, '_blank', 'noopener')}
              title="카카오톡 상담"
              aria-label="카카오톡 상담"
            >💬</button>
            <button
              className={`fab fab-fee ${commissionOn ? 'on' : ''}`}
              onClick={() => setCommissionOn((v) => !v)}
              title={commissionOn ? '수수료 표시 중 (클릭 시 숨김)' : '숨김 중 (클릭 시 표시)'}
              aria-label="수수료 시크릿 토글"
            >{commissionOn ? '💰' : '🚫'}</button>
          </>
        ) : null}
        <button
          className="fab fab-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="위로 올라가기"
          aria-label="위로 올라가기"
        >↑</button>
      </div>
    </div>
  )
}
// cache-bust-1787636532
