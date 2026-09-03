import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import { useUsers } from './lib/users.js'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { users, updateUser, removeUser, refresh } = useUsers()
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    if (!user || user.id !== 'admin') {
      navigate('/')
    }
  }, [user, navigate])

  useEffect(() => {
    refresh()
  }, [refresh])

  const list = users.filter((u) => filterStatus === 'ALL' ? true : u.status === filterStatus)

  const approve = (u) => {
    const grade = u.fee_grade || '100%'
    updateUser(u.id, { status: 'APPROVED', fee_grade: grade })
    alert('승인 완료')
    refresh()
  }

  const saveGrade = (id, grade) => {
    updateUser(id, { fee_grade: grade })
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
        </div>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>아이디</th><th>이름</th><th>생년월일</th><th>전화번호</th><th>이메일</th><th>가입일시</th><th>승인상태</th><th>수수료 등급</th><th>관리</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
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
                    <option value="24%">수수료 24%</option>
                  </select>
                </td>
                <td className="actions">
                  {u.status === 'PENDING' && <button className="btn primary" onClick={() => approve(u)}>승인</button>}
                  {u.id !== 'admin' && <button className="btn danger" onClick={() => del(u.id)}>삭제</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="9" className="empty">표시할 회원이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      <footer className="site-footer">
        <div className="foot-row copy">AllRental Admin</div>
      </footer>
    </div>
  )
}
