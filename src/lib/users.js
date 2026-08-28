import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

const FALLBACK_KEY = 'allrental_users'
const AUTH_KEY = 'allrental_auth'

const FEE_GRADES = {
  '100%': { label: '수수료 100%', rate: 1.0 },
  '10%': { label: '수수료 10% 제외', rate: 0.90 },
  '18%': { label: '수수료 18% 제외', rate: 0.82 },
  '24%': { label: '수수료 24% 제외', rate: 0.76 },
}

function fallbackGetUsers() {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
  } catch {
    return []
  }
}

function fallbackSetUsers(users) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(users))
}

async function dbFetchUsers() {
  const { data, error } = await supabase.from('users').select('*')
  if (error) throw error
  return data || []
}

async function dbInsertUser(u) {
  const { data, error } = await supabase.from('users').insert([{ ...u, created_at: new Date().toISOString() }]).select().single()
  if (error) throw error
  return data
}

async function dbUpdateUser(id, patch) {
  const { data, error } = await supabase.from('users').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function dbDeleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

export function getUsers() {
  return fallbackGetUsers()
}

export function getFeeGrade(gradeKey) {
  return FEE_GRADES[gradeKey] || FEE_GRADES['100%']
}

export function useUsers() {
  const [users, setUsers] = useState([])

  const refresh = useCallback(async () => {
    try {
      const data = await dbFetchUsers()
      setUsers(data)
      fallbackSetUsers(data)
    } catch {
      setUsers(fallbackGetUsers())
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const addUser = useCallback(async (u) => {
    const row = { id: u.id?.trim(), pw: u.pw, name: u.name, birth: u.birth || '', phone: u.phone || '', email: u.email || '', status: 'PENDING', fee_grade: '100%' }
    try {
      const saved = await dbInsertUser(row)
      setUsers((prev) => {
        const next = [...prev, saved]
        fallbackSetUsers(next)
        return next
      })
    } catch (e) {
      alert('회원가입 저장 실패: ' + (e.message || e))
    }
  }, [])

  const updateUser = useCallback(async (id, patch) => {
    try {
      const saved = await dbUpdateUser(id, patch)
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === id ? saved : u))
        fallbackSetUsers(next)
        return next
      })
    } catch (e) {
      alert('저장 실패: ' + (e.message || e))
    }
  }, [])

  const removeUser = useCallback(async (id) => {
    try {
      await dbDeleteUser(id)
      setUsers((prev) => {
        const next = prev.filter((u) => u.id !== id)
        fallbackSetUsers(next)
        return next
      })
    } catch (e) {
      alert('삭제 실패: ' + (e.message || e))
    }
  }, [])

  return { users, addUser, updateUser, removeUser, refresh, FEE_GRADES }
}

export async function initDefaults() {
  try {
    const exists = await dbFetchUsers()
    if (exists.some((u) => u.id === 'admin')) return exists
    const admin = { id: 'admin', pw: 'admin', name: '관리자', birth: '', phone: '', email: '', status: 'APPROVED', fee_grade: '100%', created_at: new Date().toISOString() }
    const { data } = await supabase.from('users').insert([admin]).select().single()
    const list = [data, ...exists]
    fallbackSetUsers(list)
    return list
  } catch {
    const local = fallbackGetUsers()
    fallbackSetUsers(local)
    return local
  }
}
