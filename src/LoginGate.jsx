import { useState } from 'react'
import { useAuth } from './auth'

export function LoginGate({ children }) {
  const { user, login, logout } = useAuth()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  if (user) {
    return (
      <>
        <div className="auth-header">
          <span>로그인: <b>{user.id}</b> (수수료 반영률 {(user.rate * 100).toFixed(0)}%)</span>
          <button className="logout-btn" onClick={logout}>로그아웃</button>
        </div>
        {children}
      </>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    const ok = login(id, pw)
    if (!ok) setErr('아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  return (
    <div className="splash">
      <div className="box login-card">
        <div className="login-logo">ALLRENTAL</div>
        <p className="login-sub">렌탈 상담 포털</p>
        <form onSubmit={submit}>
          <input
            className="login-input"
            type="text"
            placeholder="아이디"
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoFocus
          />
          <input
            className="login-input"
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {err && <div className="login-error">{err}</div>}
          <button className="login-submit" type="submit">로그인</button>
        </form>
      </div>
    </div>
  )
}
