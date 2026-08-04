import React from 'react'

export default function Placeholder({ title }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--radius)',
        padding: '3rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <h2 style={{ color: 'var(--text)' }}>{title}</h2>
      <p>이 페이지는 아직 구현 전입니다. (클론 진행 단계에서 추가 예정)</p>
    </div>
  )
}
