import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Catalog from './Catalog.jsx'
import Layout from './components/Layout.jsx'
import { LoginGate } from './LoginGate.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import Main from './Main.jsx'
import EstimateForm from './EstimateForm.jsx'
import Counsel from './Counsel.jsx'
import SettlementManage from './SettlementManage.jsx'
import SubmissionList from './SubmissionList.jsx'
import CustomerApplyManage from './CustomerApplyManage.jsx'
import SuggestionBoard from './SuggestionBoard.jsx'
import Details from './Details.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginGate><Catalog /></LoginGate>} />
      <Route path="/admin" element={<LoginGate><AdminDashboard /></LoginGate>} />
      <Route path="/admin/counsel" element={<Layout><Counsel /></Layout>} />
      <Route path="/admin/reception" element={<Layout><Main /></Layout>} />
      <Route path="/admin/details" element={<Layout><Details /></Layout>} />
      <Route path="/admin/estimate_form" element={<Layout><EstimateForm /></Layout>} />
      <Route path="/admin/submission_list" element={<Layout><SubmissionList /></Layout>} />
      <Route path="/admin/progress" element={<Layout><Counsel /></Layout>} />
      <Route path="/admin/settlement_manage" element={<Layout><SettlementManage /></Layout>} />
      <Route path="/admin/customer_apply_manage" element={<Layout><CustomerApplyManage /></Layout>} />
      <Route path="/admin/promotions" element={<Layout><Counsel /></Layout>} />
      <Route path="/admin/creditcard" element={<Layout><Counsel /></Layout>} />
      <Route path="/admin/suggestion_board" element={<Layout><SuggestionBoard /></Layout>} />
      <Route path="/admin/business_card" element={<Layout><Counsel /></Layout>} />
      <Route path="/admin/faq" element={<Layout><Counsel /></Layout>} />
      <Route path="/admin/howto" element={<Layout><Counsel /></Layout>} />
    </Routes>
  )
}
