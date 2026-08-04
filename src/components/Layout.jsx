import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export default function Layout({ menus }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 사이드바 */}
      <aside
        style={{
          width: 210,
          background: 'var(--navy)',
          color: '#fff',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '1.25rem 1rem', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.5px' }}>
          ALL &amp; UP
        </div>
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {menus.map(m => (
            <NavLink
              key={m.key}
              to={`/${m.key}`}
              className={({ isActive }) => 'side-item' + (isActive ? ' active' : '')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', color: '#cfd6e0' }}
            >
              <img
                src={`./assets/webimage/sidebar/${m.icon}.png`}
                alt=""
                style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }}
              />
              <span style={{ fontSize: '0.9rem' }}>{m.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: 56,
            background: 'var(--navy)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.25rem',
            gap: 12,
          }}
        >
          <span style={{ fontWeight: 700 }}>WEB&amp;ON + 상담</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', opacity: 0.8 }}>파트너 포털</span>
        </header>
        <main style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', background: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
