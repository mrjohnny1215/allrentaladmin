import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Catalog from './Catalog.jsx'
import Layout from './components/Layout.jsx'
import { LoginGate } from './LoginGate.jsx'

// ⚠️ BrowserRouter 는 main.jsx 에 단 하나만 존재해야 함 (중첩 시 런타임 에러로 화면 백지)
export default function App() {
  return (
    <Routes>
      {/* 메인: 로그인 게이트 + 렌탈 카탈로그 */}
      <Route path="/" element={<LoginGate><Catalog /></LoginGate>} />
      {/* 기존 ALL&UP 상담 포털 유지 */}
      <Route path="/admin/*" element={<Layout />} />
    </Routes>
  )
}
