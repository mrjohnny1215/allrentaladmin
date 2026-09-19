import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import { useUsers } from './lib/users.js'
import { supabase } from './lib/supabase.js'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { users, updateUser, removeUser, refresh } = useUsers()
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [settlementAccounts, setSettlementAccounts] = useState([])
  const [settlementMsg, setSettlementMsg] = useState('')
  const [settlementPasswordOpen, setSettlementPasswordOpen] = useState(false)
  const [settlementPassword, setSettlementPassword] = useState('')
  const [employeeDetail, setEmployeeDetail] = useState(null)
  const [employeeDetailMsg, setEmployeeDetailMsg] = useState('')
  const [expandedManagerId, setExpandedManagerId] = useState(null)

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/')
    }
  }, [user, navigate])

  useEffect(() => {
    refresh()
  }, [refresh])

  const list = users.filter((u) => filterStatus === 'ALL' ? true : u.status === filterStatus)
  // 역할이 팀장/관리자가 아니더라도 실제 소속 관리자로 지정된 회원은 관리자 묶음으로 표시한다.
  const managerIds = new Set(users.filter((u) => u.parent_id).map((u) => u.parent_id))
  users.filter((u) => ['ADMIN', 'MANAGER'].includes(u.role)).forEach((u) => managerIds.add(u.id))
  const managers = list.filter((u) => managerIds.has(u.id))
  const pendingMembers = list.filter((u) => u.status === 'PENDING' && !managerIds.has(u.id))
  const displayedMembers = expandedManagerId
    ? list.filter((u) => u.id === expandedManagerId || (!managerIds.has(u.id) && u.parent_id === expandedManagerId))
    : pendingMembers

  const approve = (u, role = 'SALES') => {
    const grade = u.fee_grade || '100%'
    updateUser(u.id, { status: 'APPROVED', fee_grade: grade, role, parent_id: '김성훈' })
    alert('승인 완료')
    refresh()
  }

  const saveGrade = (id, grade) => {
    updateUser(id, { fee_grade: grade })
    refresh()
  }

  const saveOrganization = (id, patch) => {
    updateUser(id, patch)
    refresh()
  }

  const saveRole = (id, role) => {
    updateUser(id, { role })
    refresh()
  }

  const del = (id) => {
    if (!confirm('탈퇴/삭제 하시겠습니까?')) return
    removeUser(id)
    refresh()
  }

  const logoutAndGo = () => {
    logout()
    window.location.href = '/'
  }

  const statusLabel = (s) => (s === 'APPROVED' ? '승인' : s === 'PENDING' ? '대기' : s)

  const loadSettlementAccounts = async (password = user?.pw) => {
    if (!password) { setSettlementPasswordOpen(true); return }
    const { data, error } = await supabase.functions.invoke('member-financial-profile-v4', { body: { action: 'manager-list', id: user.id, password } })
    if (error || data?.error) { setSettlementMsg(data?.error || '계좌 조회에 실패했습니다.'); return }
    setSettlementAccounts(data.profiles || []); setSettlementMsg(`정산 계좌 ${data.profiles?.length || 0}건을 조회했습니다.`); setSettlementPasswordOpen(false); setSettlementPassword('')
  }

  const openEmployeeDetail = async (employee) => {
    if (employee.id === user.id) return
    if (!user?.pw) { setEmployeeDetailMsg('로그아웃 후 다시 로그인해 주세요.'); return }
    setEmployeeDetailMsg('직원 접수·정산 정보를 불러오는 중입니다.')
    const { data, error } = await supabase.functions.invoke('submission-review-v1', {
      body: { action: 'employee-summary', id: user.id, password: user.pw, employeeId: employee.id },
    })
    if (error || data?.error) { setEmployeeDetailMsg(data?.error || '직원 정보를 불러오지 못했습니다.'); return }
    setEmployeeDetail(data); setEmployeeDetailMsg('')
  }

  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <h1>관리자 대시보드</h1>
        <div>
          <span className="admin-id">관리자: <b>{user.id}</b></span>
          <button className="logout-btn" onClick={logoutAndGo}>로그아웃</button>
        </div>
      </header>

      <div className="admin-toolbar">
        <span>총 회원: {users.length}명</span>
        <div className="seg">
          {['ALL', 'PENDING', 'APPROVED'].map((s) => (
            <button key={s} className={filterStatus === s ? 'on' : ''} onClick={() => setFilterStatus(s)}>
              {s === 'ALL' ? '전체' : statusLabel(s)}
            </button>
          ))}
          <button onClick={loadSettlementAccounts}>소속 직원 정산 계좌</button>
        </div>
      </div>

      {settlementMsg && <div className="admin-toolbar">{settlementMsg}</div>}
      {settlementPasswordOpen && <div className="modal-veil" onClick={() => setSettlementPasswordOpen(false)}>
        <div className="modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-topbar"><div className="modal-topbar-title">소속직원 정산 계좌 조회</div><button className="modal-close" onClick={() => setSettlementPasswordOpen(false)}>×</button></div>
          <div className="modal-body" style={{ padding: 18 }}>
            <p style={{ marginTop: 0 }}>현재 관리자 비밀번호를 입력해 주세요.</p>
            <input className="input-x" type="password" value={settlementPassword} onChange={(e) => setSettlementPassword(e.target.value)} placeholder="현재 비밀번호" autoFocus />
            <button className="btn btn-primary-x" style={{ width: '100%', marginTop: 12 }} onClick={() => loadSettlementAccounts(settlementPassword)}>정산 계좌 조회</button>
          </div>
        </div>
      </div>}
      {settlementAccounts.length > 0 && <div className="table-scroll" style={{ margin: '12px 16px' }}>
        <table className="admin-table"><thead><tr><th>직원</th><th>은행</th><th>계좌번호</th><th>예금주</th><th>수정일</th></tr></thead><tbody>
          {settlementAccounts.map((account) => <tr key={account.user_id}><td>{account.name} ({account.user_id})</td><td>{account.bank_name}</td><td>{account.account_number}</td><td>{account.account_holder}</td><td>{new Date(account.updated_at).toLocaleDateString('ko-KR')}</td></tr>)}
        </tbody></table>
      </div>}

      <section style={{ margin: '16px', padding: 20, border: '1px solid #cfe0ff', borderRadius: 16, background: 'linear-gradient(180deg, #f8fbff 0%, #fff 100%)' }}>
        <div style={{ fontWeight: 900, fontSize: 17 }}>조직도</div>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 5 }}>관리자와 소속 영업사원 현황입니다. 팀 카드를 누르면 아래에서 상세 명단을 볼 수 있습니다.</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 8px' }}>
          <div style={{ padding: '10px 18px', borderRadius: 10, color: '#fff', background: '#172554', fontWeight: 900 }}>최고 관리자 · {users.find((member) => member.id === 'admin')?.name || '관리자'} (admin)</div>
        </div>
        <div style={{ width: 2, height: 20, margin: '0 auto', background: '#94a3b8' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginTop: 10 }}>
          {managers.filter((manager) => manager.id !== 'admin').map((manager) => {
            const members = users.filter((member) => !managerIds.has(member.id) && member.parent_id === manager.id)
            const active = expandedManagerId === manager.id
            return <button key={manager.id} onClick={() => setExpandedManagerId(active ? null : manager.id)} style={{ padding: 14, border: `1px solid ${active ? '#2563eb' : '#cbd5e1'}`, borderRadius: 12, background: active ? '#eff6ff' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ color: '#1d4ed8', fontSize: 12, fontWeight: 900 }}>관리자 / 팀장</div>
              <div style={{ marginTop: 3, color: '#172554', fontWeight: 900 }}>{manager.name} <span style={{ color: '#64748b', fontWeight: 600 }}>({manager.id})</span></div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0', color: '#475569', fontSize: 13, lineHeight: 1.7 }}>{members.length ? members.map((member) => member.name).join(' · ') : '소속 영업사원 없음'}</div>
            </button>
          })}
          {managers.filter((manager) => manager.id !== 'admin').length === 0 && <div className="empty">등록된 관리자 또는 팀장이 없습니다.</div>}
        </div>
      </section>

      <section style={{ margin: '16px', padding: 18, border: '1px solid #dbe4ef', borderRadius: 14, background: '#f8fbff' }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>관리자 선택</div>
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 14 }}>관리자를 클릭하면 해당 소속 영업사원만 표시됩니다.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {managers.map((manager) => {
            const salesCount = users.filter((member) => !managerIds.has(member.id) && member.parent_id === manager.id).length
            const active = expandedManagerId === manager.id
            return <button key={manager.id} className={`btn ${active ? 'primary' : 'btn-outline-x'}`} onClick={() => setExpandedManagerId(active ? null : manager.id)}>
              {manager.name} ({manager.id}) · 영업사원 {salesCount}명
            </button>
          })}
          {!managers.length && <span className="empty">표시할 관리자가 없습니다.</span>}
        </div>
      </section>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>아이디</th><th>이름</th><th>소속 관리자</th><th>역할</th><th>생년월일</th><th>전화번호</th><th>이메일</th><th>가입일시</th><th>승인상태</th><th>수수료 등급</th><th>관리</th>
            </tr>
          </thead>
          <tbody>
            {displayedMembers.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td><button className="btn btn-outline-x" onClick={() => openEmployeeDetail(u)}>{u.name}</button></td>
                <td>
                  <select value={u.parent_id || ''} onChange={(e) => saveOrganization(u.id, { parent_id: e.target.value || null })} disabled={u.id === 'admin'}>
                    <option value="">최상위</option>
                    {users.filter((manager) => manager.id !== u.id && manager.status === 'APPROVED' && ['ADMIN', 'MANAGER'].includes(manager.role)).map((manager) => (
                      <option key={manager.id} value={manager.id}>{manager.name} ({manager.id})</option>
                    ))}
                  </select>
                </td>
                <td>
                  {u.id === 'admin' ? (
                    <b>최고 관리자</b>
                  ) : (
                    <select value={u.role || 'SALES'} onChange={(e) => saveRole(u.id, e.target.value)} disabled={u.status !== 'APPROVED'} aria-label={`${u.name} 역할`}>
                      <option value="SALES">영업사원</option>
                      <option value="MANAGER">팀장(관리자)</option>
                    </select>
                  )}
                </td>
                <td>{u.birth || '-'}</td>
                <td>{u.phone || '-'}</td>
                <td>{u.email || '-'}</td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleString('ko-KR') : '-'}</td>
                <td>
                  <span className={`badge ${u.status === 'APPROVED' ? 'ok' : 'warn'}`}>{statusLabel(u.status)}</span>
                </td>
                <td>
                  <select value={u.fee_grade || '100%'} onChange={(e) => saveGrade(u.id, e.target.value)}>
                    <option value="100%">수수료 100%</option>
                    <option value="90%">수수료 90%</option>
                    <option value="82%">수수료 82%</option>
                    <option value="76%">수수료 76%</option>
                  </select>
                </td>
                <td className="actions">
                  {u.status === 'PENDING' && <>
                    <button className="btn primary" onClick={() => approve(u, 'SALES')}>사원 승인</button>
                    <button className="btn primary" onClick={() => approve(u, 'MANAGER')}>팀장 승인</button>
                  </>}
                  {u.id !== 'admin' && <button className="btn danger" onClick={() => del(u.id)}>삭제</button>}
                </td>
              </tr>
            ))}
            {!expandedManagerId && pendingMembers.length === 0 && <tr><td colSpan="11" className="empty">위에서 관리자를 선택하면 소속 영업사원이 표시됩니다.</td></tr>}
            {expandedManagerId && displayedMembers.length === 0 && <tr><td colSpan="11" className="empty">해당 관리자에게 소속된 영업사원이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {employeeDetailMsg && <div className="admin-toolbar">{employeeDetailMsg}</div>}
      {employeeDetail && <div className="modal-veil" onClick={() => setEmployeeDetail(null)}>
        <div className="modal-card" style={{ maxWidth: 920, maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-topbar"><div className="modal-topbar-title">{employeeDetail.employee.name} ({employeeDetail.employee.id}) 직원 상세</div><button className="modal-close" onClick={() => setEmployeeDetail(null)}>×</button></div>
          <div className="modal-body" style={{ padding: 18, overflowY: 'auto' }}>
            <div className="field-grid" style={{ marginBottom: 18 }}>
              <div className="preview-container"><b>접수 건수</b><div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{employeeDetail.settlement.count}건</div></div>
              <div className="preview-container"><b>예상 정산액</b><div style={{ fontSize: 24, fontWeight: 900, marginTop: 8, color: '#1d4ed8' }}>{employeeDetail.settlement.expectedPayout.toLocaleString()}원</div><small>수수료 {Math.round(employeeDetail.settlement.rate * 100)}% 적용</small></div>
            </div>
            <div className="preview-container" style={{ marginBottom: 18 }}><b>정산 계좌</b><div style={{ marginTop: 8 }}>{employeeDetail.account ? `${employeeDetail.account.bank_name} · ${employeeDetail.account.account_number} · ${employeeDetail.account.account_holder}` : '등록된 계좌가 없습니다.'}</div></div>
            <div className="table-scroll"><table className="admin-table"><thead><tr><th>접수일</th><th>고객명</th><th>상품</th><th>렌탈료</th><th>검수상태</th><th>상세</th></tr></thead><tbody>
              {employeeDetail.submissions.map((submission) => <tr key={submission.id}><td>{new Date(submission.createdAt).toLocaleDateString('ko-KR')}</td><td>{submission.customerName}</td><td>{submission.items?.[0]?.productName || '-'}</td><td>{submission.items?.[0]?.rentalFee || '-'}</td><td>{submission.reviewStatus}</td><td><button className="btn primary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => { setEmployeeDetail(null); navigate('/admin/submission_list', { state: { selectedAppId: submission.id } }) }}>상세 보기</button></td></tr>)}
              {!employeeDetail.submissions.length && <tr><td colSpan="6" className="empty">접수 내역이 없습니다.</td></tr>}
            </tbody></table></div>
          </div>
        </div>
      </div>}

      <footer className="site-footer">
        <div className="foot-row copy">AllRental Admin</div>
      </footer>
    </div>
  )
}
