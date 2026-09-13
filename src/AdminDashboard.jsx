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
  const [employeeDetail, setEmployeeDetail] = useState(null)
  const [employeeDetailMsg, setEmployeeDetailMsg] = useState('')

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/')
    }
  }, [user, navigate])

  useEffect(() => {
    refresh()
  }, [refresh])

  const list = users.filter((u) => filterStatus === 'ALL' ? true : u.status === filterStatus)

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

  const loadSettlementAccounts = async () => {
    const password = window.prompt('정산 계좌를 조회하려면 현재 비밀번호를 입력해 주세요.')
    if (!password) return
    const { data, error } = await supabase.functions.invoke('member-financial-profile-v4', { body: { action: 'manager-list', id: user.id, password } })
    if (error || data?.error) { setSettlementMsg(data?.error || '계좌 조회에 실패했습니다.'); return }
    setSettlementAccounts(data.profiles || []); setSettlementMsg(`정산 계좌 ${data.profiles?.length || 0}건을 조회했습니다.`)
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
      {settlementAccounts.length > 0 && <div className="table-scroll" style={{ margin: '12px 16px' }}>
        <table className="admin-table"><thead><tr><th>직원</th><th>은행</th><th>계좌번호</th><th>예금주</th><th>수정일</th></tr></thead><tbody>
          {settlementAccounts.map((account) => <tr key={account.user_id}><td>{account.name} ({account.user_id})</td><td>{account.bank_name}</td><td>{account.account_number}</td><td>{account.account_holder}</td><td>{new Date(account.updated_at).toLocaleDateString('ko-KR')}</td></tr>)}
        </tbody></table>
      </div>}

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>아이디</th><th>이름</th><th>소속 관리자</th><th>역할</th><th>생년월일</th><th>전화번호</th><th>이메일</th><th>가입일시</th><th>승인상태</th><th>수수료 등급</th><th>관리</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
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
                  <b>{u.role === 'ADMIN' ? '관리자' : '영업사원'}</b>
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
                    <button className="btn primary" onClick={() => approve(u, 'ADMIN')}>관리자 승인</button>
                  </>}
                  {u.id !== 'admin' && <button className="btn danger" onClick={() => del(u.id)}>삭제</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="11" className="empty">표시할 회원이 없습니다.</td></tr>}
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
            <div className="table-scroll"><table className="admin-table"><thead><tr><th>접수일</th><th>고객명</th><th>상품</th><th>렌탈료</th><th>검수상태</th></tr></thead><tbody>
              {employeeDetail.submissions.map((submission) => <tr key={submission.id}><td>{new Date(submission.createdAt).toLocaleDateString('ko-KR')}</td><td>{submission.customerName}</td><td>{submission.items?.[0]?.productName || '-'}</td><td>{submission.items?.[0]?.rentalFee || '-'}</td><td>{submission.reviewStatus}</td></tr>)}
              {!employeeDetail.submissions.length && <tr><td colSpan="5" className="empty">접수 내역이 없습니다.</td></tr>}
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
