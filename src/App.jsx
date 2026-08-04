import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Counsel from './pages/Counsel.jsx'
import Placeholder from './pages/Placeholder.jsx'

// 14개 메뉴 정의 (원본 layout.php?page=XXX 기준)
const MENUS = [
  { key: 'counsel', label: '상담', file: 'counsel', icon: 'counsel' },
  { key: 'details', label: '상세', file: 'details', icon: 'details' },
  { key: 'estimate_form', label: '견적서', file: 'estimate_form', icon: 'estimate' },
  { key: 'submission_list', label: '접수목록', file: 'submission_list', icon: 'list' },
  { key: 'progress', label: '진행현황', file: 'progress', icon: 'progress' },
  { key: 'settlement_manage', label: '정산관리', file: 'settlement_manage', icon: 'settlement_manage' },
  { key: 'customer_apply_manage', label: '고객신청', file: 'customer_apply_manage', icon: 'order' },
  { key: 'promotions', label: '프로모션', file: 'promotions', icon: 'promotion' },
  { key: 'creditcard', label: '제휴카드', file: 'creditcard', icon: 'card' },
  { key: 'suggestion_board', label: '제안게시판', file: 'suggestion_board', icon: 'board' },
  { key: 'business_card', label: '명함', file: 'business_card', icon: 'business_card' },
  { key: 'faq', label: 'FAQ', file: 'faq', icon: 'faq' },
  { key: 'howto', label: '사용법', file: 'howto', icon: 'howto' },
  { key: 'main', label: '메인', file: 'main', icon: 'roadview' },
]

export default function App() {
  return (
    <Routes>
      <Route element={<Layout menus={MENUS} />}>
        <Route index element={<Navigate to="/counsel" replace />} />
        <Route path="/counsel" element={<Counsel />} />
        {/* 나머지 메뉴는 placeholder (향후 단계적으로 구현) */}
        {MENUS.filter(m => m.key !== 'counsel').map(m => (
          <Route key={m.key} path={`/${m.key}`} element={<Placeholder title={m.label} />} />
        ))}
        <Route path="*" element={<Navigate to="/counsel" replace />} />
      </Route>
    </Routes>
  )
}
