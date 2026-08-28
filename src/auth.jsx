import { useState, createContext, useContext } from 'react'
import { getUsers, getFeeGrade } from './lib/users.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('allrental_auth')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  const login = async (id, pw) => {
    const users = await getUsers()
    const acc = users.find((u) => u.id === id && u.pw === pw)
    if (!acc) return false
    if (acc.status === 'PENDING') {
      alert('관리자 승인 대기 중인 계정입니다. 승인 후 이용 가능합니다.')
      return false
    }
    const fee = getFeeGrade(acc.fee_grade || '100%')
    const session = { id: acc.id, name: acc.name, rate: fee.rate, feeGrade: acc.fee_grade, status: acc.status }
    localStorage.setItem('allrental_auth', JSON.stringify(session))
    setUser(session)
    return true
  }

  const logout = () => {
    localStorage.removeItem('allrental_auth')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function applyFeeRate(value, rate) {
  if (!value || !rate) return value
  return Math.floor(value * rate)
}
