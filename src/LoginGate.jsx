import { useState } from 'react'
import { useAuth } from './auth.jsx'
import { getUsers, useUsers } from './lib/users.js'

export function LoginGate({ children }) {
  const { user, login, logout } = useAuth()
  const { addUser, updateUser } = useUsers()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const [regOpen, setRegOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)

  // 회원가입 상태
  const [rPw, setRPw] = useState('')
  const [rName, setRName] = useState('')
  const [rBirth, setRBirth] = useState('')
  const [rPhone, setRPhone] = useState('')
  const [rEmail, setREmail] = useState('')
  const [regMsg, setRegMsg] = useState('')

  // 비번찾기 상태
  const [fId, setFId] = useState('')
  const [fName, setFName] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fNewPw, setFNewPw] = useState('')
  const [foundUser, setFoundUser] = useState(null)
  const [findMsg, setFindMsg] = useState('')

  if (user) {
    return (
      <>
        <div className="auth-header">
          <span>로그인: <b>{user.id}</b></span>
          <button className="logout-btn" onClick={logout}>로그아웃</button>
        </div>
        {children}
      </>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setShake(false)
    const ok = await login(id, pw)
    if (!ok) {
      setErr('아이디 또는 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      return
    }
    if (id.trim() === 'admin') {
      window.location.href = '/admin'
    }
  }

  const submitReg = async (e) => {
    e.preventDefault()
    setRegMsg('')
    const _id = id.trim()
    const rpw = rPw.trim()
    const name = rName.trim()
    const birth = rBirth.trim()
    const phone = rPhone.trim()
    const email = rEmail.trim()
    if (!_id || !rpw || !name || !birth || !phone || !email) {
      setRegMsg('모든 항목을 입력해 주세요.')
      return
    }
    const users = await getUsers()
    if (users.some((u) => u.id === _id)) {
      setRegMsg('이미 존재하는 아이디입니다.')
      return
    }
    addUser({ id: _id, pw: rpw, name, birth, phone, email, status: 'PENDING', fee_grade: '100%' })
    setRegMsg('가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.')
    setRName(''); setRBirth(''); setRPhone(''); setREmail(''); setRPw(''); setId('')
  }

  const submitFind = async (e) => {
    e.preventDefault()
    setFindMsg('')
    const users = await getUsers()
    const found = users.find((u) => u.id === fId.trim() && u.name === fName.trim() && (u.phone === fPhone.trim() || u.email === fEmail.trim()))
    if (!found) {
      setFindMsg('일치하는 계정을 찾을 수 없습니다.')
      setFoundUser(null)
      return
    }
    setFoundUser(found)
    setFindMsg('계정을 찾았습니다. 비밀번호를 재설정할 수 있습니다.')
  }

  const resetPw = () => {
    const npw = fNewPw.trim()
    if (!npw) {
      setFindMsg('새 비밀번호를 입력해 주세요.')
      return
    }
    if (!foundUser) return
    updateUser(foundUser.id, { pw: npw })
    setFindMsg('비밀번호가 재설정되었습니다.')
    setFNewPw('')
  }

  return (
    <div className="splash">
      <div className={`box login-card ${shake ? 'shake' : ''}`}>
        <div className="login-logo">ALL렌탈</div>
        <p className="login-sub">렌탈 상담 포털</p>
        <form onSubmit={submit}>
          <input className="login-input" type="text" placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} autoFocus />
          <input className="login-input" type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <div className="login-error">{err}</div>}
          <button className="login-submit" type="submit">로그인</button>
        </form>
        <div className="login-links">
          <button className="link-btn" onClick={() => { setRegOpen(true); setRegMsg(''); setErr('') }}>회원가입</button>
          <button className="link-btn" onClick={() => { setFindOpen(true); setFindMsg(''); setFoundUser(null); setFId(''); setFName(''); setFPhone(''); setFEmail(''); setFNewPw('') }}>비밀번호 찾기</button>
        </div>
      </div>

      {/* 회원가입 모달 */}
      {regOpen && (
        <div className="modal-veil" onClick={(e) => { if (e.target === e.currentTarget) setRegOpen(false) }}>
          <div className="modal-card sm">
            <div className="modal-topbar">
              <span>회원가입</span>
              <button className="modal-close" onClick={() => setRegOpen(false)}>×</button>
            </div>
            <form className="modal-form" onSubmit={submitReg}>
              <input className="login-input" placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} />
              <input className="login-input" type="password" placeholder="비밀번호" value={rPw} onChange={(e) => setRPw(e.target.value)} />
              <input className="login-input" placeholder="이름" value={rName} onChange={(e) => setRName(e.target.value)} />
              <input className="login-input" type="date" placeholder="생년월일" value={rBirth} onChange={(e) => setRBirth(e.target.value)} />
              <input className="login-input" placeholder="전화번호" value={rPhone} onChange={(e) => setRPhone(e.target.value)} />
              <input className="login-input" placeholder="이메일" value={rEmail} onChange={(e) => setREmail(e.target.value)} />
              {regMsg && <div className="login-info">{regMsg}</div>}
              <button className="login-submit" type="submit">가입 신청</button>
            </form>
          </div>
        </div>
      )}

      {/* 비밀번호 찾기 모달 */}
      {findOpen && (
        <div className="modal-veil" onClick={(e) => { if (e.target === e.currentTarget) setFindOpen(false) }}>
          <div className="modal-card sm">
            <div className="modal-topbar">
              <span>비밀번호 찾기</span>
              <button className="modal-close" onClick={() => setFindOpen(false)}>×</button>
            </div>
            {!foundUser ? (
              <form className="modal-form" onSubmit={submitFind}>
                <input className="login-input" placeholder="아이디" value={fId} onChange={(e) => setFId(e.target.value)} />
                <input className="login-input" placeholder="이름" value={fName} onChange={(e) => setFName(e.target.value)} />
                <input className="login-input" placeholder="전화번호" value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
                <input className="login-input" placeholder="이메일" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
                <div className="login-info">전화번호 또는 이메일 중 하나만 입력해도 확인 가능합니다.</div>
                {findMsg && <div className="login-info">{findMsg}</div>}
                <button className="login-submit" type="submit">계정 찾기</button>
              </form>
            ) : (
              <div className="modal-form">
                <div className="login-info">아이디: {foundUser.id} / 이름: {foundUser.name}</div>
                <input className="login-input" type="password" placeholder="새 비밀번호" value={fNewPw} onChange={(e) => setFNewPw(e.target.value)} />
                {findMsg && <div className="login-info">{findMsg}</div>}
                <button className="login-submit" onClick={resetPw} type="button">비밀번호 재설정</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
