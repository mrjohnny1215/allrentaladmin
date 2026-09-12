import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AllRentalLogo from './AllRentalLogo'
import '../admin-ui.css'

const MENUS = [
  { key: 'counsel', label: '상담' },
  { key: 'main', label: '메인페이지' },
  { key: 'details', label: '제품비교' },
  { key: 'estimate_form', label: '견적서' },
  { key: 'submission_list', label: '접수내역' },
  { key: 'progress', label: '현황통계' },
  { key: 'settlement_manage', label: '정산서' },
  { key: 'customer_apply_manage', label: '접수링크' },
  { key: 'promotions', label: '프로모션' },
  { key: 'creditcard', label: '제휴카드' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathKey = location.pathname.replace(/^\/admin\/?/, '').split('/')[0] || MENUS[0].key
  const [active, setActive] = useState(MENUS.find(m => m.key === pathKey) || MENUS[0])
  const [menuOpen, setMenuOpen] = useState(false)

  const selectMenu = (m) => {
    setActive(m)
    navigate(m.key === 'main' ? '/' : '/admin/' + m.key)
    setMenuOpen(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="admin-shell-header" style={{ position: 'sticky', top: 0, zIndex: 900, height: 64, background: '#fff', color: '#172033', display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: 12, borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          aria-label="메뉴 열기"
          style={{ background: 'transparent', border: 'none', color: '#1e3a5f', fontSize: '1.4rem', cursor: 'pointer', padding: 0, marginRight: 4, display: 'inline-flex' }}
          className="hamburger-btn"
        >☰</button>
        <AllRentalLogo />
        <button className="admin-home-button" onClick={() => navigate('/')}>메인페이지</button>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', opacity: 0.8 }}>{active.label}</span>
      </header>

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
        />
      )}

      <nav
        style={{
          position: 'fixed',
          top: 64,
          left: 0,
          bottom: 0,
          width: 210,
          background: '#fff',
          color: '#172033',
          borderRight: '1px solid #e2e8f0',
          zIndex: 1000,
          transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {MENUS.map(m => (
          <div
            key={m.key}
            onClick={() => selectMenu(m)}
            className={active.key === m.key ? 'side-item active' : 'side-item'}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', color: '#334155', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '0.9rem' }}>{m.label}</span>
          </div>
        ))}
      </nav>

      <main className="allrental-admin-content" style={{ flex: 1, minHeight: 0, background: 'var(--bg)', padding: 0, margin: 0 }}>
        {children}
      </main>
    </div>
  )
}
