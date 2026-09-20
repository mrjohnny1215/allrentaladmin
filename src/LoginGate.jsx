import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import { getUsers, useUsers } from './lib/users.js'
import { supabase } from './lib/supabase.js'
import AllRentalLogo from './components/AllRentalLogo'

const BANKS = [
  ['국민은행', 'KB', '/images/banks/kb.svg'], ['신한은행', '신', '/images/banks/shinhan.png'], ['우리은행', 'W', '/images/banks/woori.png'], ['하나은행', '하', '/images/banks/hana.svg'],
  ['농협은행', 'NH', '/images/banks/nh.svg'], ['기업은행', 'IB', '/images/banks/ibk.png'], ['카카오뱅크', 'K', '/images/banks/kakaobank.png'], ['K뱅크', 'K', '/images/banks/kbank.svg'], ['토스뱅크', 'T', '/images/banks/toss.svg'],
  ['SC제일은행', 'SC', '/images/banks/sc.png'], ['부산은행', 'B', '/images/banks/bnk.png'], ['대구은행', 'D', '/images/banks/dgb.svg'], ['경남은행', 'KN', '/images/banks/knbank.png'],
]

export function LoginGate({ children }) {
  const navigate = useNavigate()
  const { user, login, logout } = useAuth()
  const { users, addUser, updateUser } = useUsers()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const [regOpen, setRegOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [financialOpen, setFinancialOpen] = useState(false)
  const [financialPw, setFinancialPw] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [financialMsg, setFinancialMsg] = useState('')
  const profileRef = useRef(null)

  // 회원가입 상태
  const [rPw, setRPw] = useState('')
  const [rName, setRName] = useState('')
  const [rBirth, setRBirth] = useState('')
  const [rPhone, setRPhone] = useState('')
  const [rEmail, setREmail] = useState('')
  const [rParentId, setRParentId] = useState('')
  const [regMsg, setRegMsg] = useState('')

  // 비번찾기 상태
  const [fId, setFId] = useState('')
  const [fName, setFName] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fNewPw, setFNewPw] = useState('')
  const [foundUser, setFoundUser] = useState(null)
  const [findMsg, setFindMsg] = useState('')

  // 외부 클릭 시 프로필 드롭다운 닫기
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const financialRequest = async (action) => {
    setFinancialMsg('')
    const { data, error } = await supabase.functions.invoke('member-financial-profile-v4', {
      body: { action, id: user.id, password: financialPw, bankName, accountNumber, accountHolder },
    })
    if (error || data?.error) { setFinancialMsg(data?.error || '처리 중 오류가 발생했습니다.'); return }
    if (action === 'get') {
      setBankName(data.profile.bank_name || ''); setAccountNumber(data.profile.account_number || ''); setAccountHolder(data.profile.account_holder || '')
      setFinancialMsg('계좌정보를 불러왔습니다.')
    } else setFinancialMsg('계좌정보를 저장했습니다.')
  }

  if (user) {
    return (
      <>
        <div className="auth-header">
          <div className="auth-left">
            <AllRentalLogo />
          </div>
          <div className="auth-right">
            <div className="profile" ref={profileRef}>
              <button className="profile-id-btn" onClick={() => setProfileOpen((v) => !v)}>
                {user.id} ▾
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <button className="profile-item" onClick={() => { setProfileOpen(false); navigate('/') }}>메인페이지</button>
                  <button className="profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/settlement_manage') }}>정산서</button>
                  <button className="profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/counsel') }}>상담</button>
                  <button className="profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/reception') }}>접수</button>
                  <button className="profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/estimate_form') }}>견적서</button>
                  <button className="profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/submission_list') }}>접수내역</button>
                  <button className="profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/customer_apply_manage') }}>접수링크</button>
                  <button className="profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/details') }}>제품비교</button>
                  <button className="profile-item" onClick={() => { setProfileOpen(false); setFinancialOpen(true); setFinancialMsg('') }}>회원정보 변경</button>
                </div>
              )}
            </div>
            <button className="logout-btn" onClick={() => { setFinancialOpen(true); setFinancialMsg('') }}>회원정보 변경</button>
            <button className="logout-btn" onClick={logout}>로그아웃</button>
          </div>
        </div>
        {financialOpen && <div className="modal-veil" onClick={(e) => e.target === e.currentTarget && setFinancialOpen(false)}>
          <div className="modal-card sm">
            <div className="modal-topbar"><span>회원정보 변경</span><button className="modal-close" onClick={() => setFinancialOpen(false)}>×</button></div>
            <div className="modal-form">
              <input className="login-input" value={user.id} disabled />
              <input className="login-input" type="password" placeholder="현재 비밀번호" value={financialPw} onChange={(e) => setFinancialPw(e.target.value)} />
              <button className="btn-ghost-x" onClick={() => financialRequest('get')}>기존 계좌정보 불러오기</button>
              <div className="bank-picker" aria-label="은행 선택">
                {BANKS.map(([name, mark, icon]) => <button key={name} type="button" className={`bank-option ${bankName === name ? 'on' : ''}`} onClick={() => setBankName(name)}>
                  <span className="bank-icon-wrap">{icon ? <img className="bank-icon" src={icon} alt={`${name} 로고`} /> : <span className="bank-fallback">{mark}</span>}</span><span>{name.replace('은행', '')}</span>
                </button>)}
              </div>
              <input className="login-input" placeholder="계좌번호" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
              <input className="login-input" placeholder="예금주" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
              {financialMsg && <div className="login-info">{financialMsg}</div>}
              <button className="login-submit" onClick={() => financialRequest('save')}>계좌정보 저장</button>
            </div>
          </div>
        </div>}
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
      return
    }
    if (ok.role === 'ADMIN') {
      navigate('/admin')
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
    if (!_id || !rpw || !name || !birth || !phone || !email || !rParentId) {
      setRegMsg('모든 항목을 입력해 주세요.')
      return
    }
    const storedUsers = users.length ? users : await getUsers()
    if (storedUsers.some((u) => u.id === _id)) {
      setRegMsg('이미 존재하는 아이디입니다.')
      return
    }
    await addUser({ id: _id, pw: rpw, name, birth, phone, email, parent_id: rParentId, role: 'SALES' })
    setRegMsg('가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.')
    setRName(''); setRBirth(''); setRPhone(''); setREmail(''); setRPw(''); setRParentId(''); setId('')
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
      <div className="box login-card">
        <AllRentalLogo />
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
              <select className="login-input" value={rParentId} onChange={(e) => setRParentId(e.target.value)} required>
                <option value="">소속 관리자 선택</option>
                {users.filter((u) => u.status === 'APPROVED' && (['ADMIN', 'MANAGER'].includes(u.role) || users.some((member) => member.parent_id === u.id))).map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role === 'ADMIN' ? '최고 관리자' : '관리자/팀장'})</option>
                ))}
              </select>
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
