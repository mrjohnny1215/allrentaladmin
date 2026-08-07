import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'

// 14개 메뉴 (원본 layout.php?page=XXX 기준)
// type: 'static' = public/pages/<file>.html 을 iframe으로, 'react' = React 라우트
const MENUS = [
  { key: 'counsel', label: '상담', icon: 'counsel', type: 'react' },
  { key: 'main', label: '메인', icon: 'roadview', type: 'static', file: 'main' },
  { key: 'details', label: '상세', icon: 'details', type: 'static', file: 'details' },
  { key: 'estimate_form', label: '견적서', icon: 'estimate', type: 'static', file: 'estimate_form' },
  { key: 'submission_list', label: '접수목록', icon: 'list', type: 'static', file: 'submission_list' },
  { key: 'progress', label: '진행현황', icon: 'progress', type: 'static', file: 'progress' },
  { key: 'settlement_manage', label: '정산관리', icon: 'settlement_manage', type: 'static', file: 'settlement_manage' },
  { key: 'customer_apply_manage', label: '고객신청', icon: 'order', type: 'static', file: 'customer_apply_manage' },
  { key: 'promotions', label: '프로모션', icon: 'promotion', type: 'static', file: 'promotions' },
  { key: 'creditcard', label: '제휴카드', icon: 'card', type: 'static', file: 'partner-card' },
  { key: 'suggestion_board', label: '제안게시판', icon: 'board', type: 'static', file: 'suggestion_board' },
  { key: 'business_card', label: '명함', icon: 'business_card', type: 'static', file: 'business_card' },
  { key: 'faq', label: 'FAQ', icon: 'faq', type: 'static', file: 'faq' },
  { key: 'howto', label: '사용법', icon: 'howto', type: 'static', file: 'howto' },
]

export default function Layout() {
  const [active, setActive] = useState(MENUS[0])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectMenu = (m) => {
    setActive(m)
    setSidebarOpen(false) // 모바일에서 메뉴 선택 시 사이드바 닫음
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 사이드바 (모바일: 오버레이 토글) */}
      <aside
        className="app-sidebar"
        style={{
          width: 210,
          background: 'var(--navy)',
          color: '#fff',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1000,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        <div style={{ padding: '1.25rem 1rem', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.5px' }}>ALL &amp; UP</div>
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {MENUS.map(m => (
            <div
              key={m.key}
              onClick={() => selectMenu(m)}
              className={active.key === m.key ? 'side-item active' : 'side-item'}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', color: '#cfd6e0', cursor: 'pointer' }}
            >
              <img src={`./assets/webimage/sidebar/${m.icon}.png`} alt="" style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }} />
              <span style={{ fontSize: '0.9rem' }}>{m.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      {/* 사이드바 열렸을 때 배경 dim (모바일) */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
        />
      )}

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: 0 }}>
        <header style={{ height: 56, background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: 12 }}>
          {/* 햄버거 버튼 (모바일에서만 보임) */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="메뉴 열기"
            style={{ display: 'none', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', padding: 0, marginRight: 4 }}
            className="hamburger-btn"
          >☰</button>
          <span style={{ fontWeight: 700 }}>WEB&amp;ON + 상담</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', opacity: 0.8 }}>{active.label}</span>
        </header>
        <main style={{ flex: 1, minHeight: 0, background: 'var(--bg)' }}>
          {active.key === 'counsel' ? (
            <iframe src="/pages/counsel.html" title="counsel" style={{ width: '100%', height: '100%', border: 'none' }} />
          ) : (
            <iframe src={`/pages/${active.file}.html`} title={active.label} style={{ width: '100%', height: '100%', border: 'none' }} />
          )}
        </main>
      </div>
    </div>
  )
}
