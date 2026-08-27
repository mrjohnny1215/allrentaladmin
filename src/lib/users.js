import { useState, useEffect, useCallback } from 'react'

const KEY = 'allrental_users'

const FEE_GRADES = {
  '100%': { label: '수수료 100%', rate: 1.0 },
  '10%': { label: '수수료 10% 제외', rate: 0.90 },
  '18%': { label: '수수료 18% 제외', rate: 0.82 },
  '24%': { label: '수수료 24% 제외', rate: 0.76 },
}

function safeGetUsers() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return null
    return arr
  } catch {
    return null
  }
}

function safeSetUsers(users) {
  localStorage.setItem(KEY, JSON.stringify(users))
}

export function getUsers() {
  return safeGetUsers() ?? initDefaults()
}

export function getFeeGrade(gradeKey) {
  return FEE_GRADES[gradeKey] || FEE_GRADES['100%']
}

export function useUsers() {
  const [users, setUsers] = useState(() => getUsers())

  useEffect(() => {
    safeSetUsers(users)
  }, [users])

  const addUser = useCallback((u) => {
    setUsers((prev) => {
      const next = [...prev, { ...u, id: u.id?.trim(), createdAt: new Date().toISOString(), status: 'PENDING', feeGrade: '100%' }]
      safeSetUsers(next)
      return next
    })
  }, [])

  const updateUser = useCallback((id, patch) => {
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
      safeSetUsers(next)
      return next
    })
  }, [])

  const removeUser = useCallback((id) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== id)
      safeSetUsers(next)
      return next
    })
  }, [])

  const refresh = useCallback(() => setUsers(getUsers()), [])

  return { users, addUser, updateUser, removeUser, refresh, FEE_GRADES }
}

function initDefaults() {
  const defaults = [
    { id: 'admin', pw: 'admin', name: '관리자', birth: '', phone: '', email: '', status: 'APPROVED', feeGrade: '100%', createdAt: new Date().toISOString() },
  ]
  safeSetUsers(defaults)
  return defaults
}
