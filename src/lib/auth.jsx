import { useState, createContext, useContext } from 'react'

const ACCOUNTS = {
  all001: { pw: '1234', rate: 1.0 },
  all002: { pw: '1234', rate: 0.9 },
  all003: { pw: '1234', rate: 0.82 },
  all004: { pw: '1234', rate: 0.76 },
}

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('allrental_auth')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  const login = (id, pw) => {
    const acc = ACCOUNTS[id]
    if (!acc || acc.pw !== pw) return false
    const session = { id, rate: acc.rate }
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
