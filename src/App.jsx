import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Catalog from './Catalog.jsx'
import Layout from './components/Layout.jsx'
import { LoginGate } from './LoginGate.jsx'
import AdminDashboard from './AdminDashboard.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginGate><Catalog /></LoginGate>} />
      <Route path="/admin" element={<LoginGate><AdminDashboard /></LoginGate>} />
      <Route path="/admin/*" element={<Layout />} />
    </Routes>
  )
}
