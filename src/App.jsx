export default function App() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '500px', backgroundColor: '#fff', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '24px', color: '#ef4444', marginBottom: '16px' }}>⚠️ 500 Internal Server Error</h1>
        <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px' }}>
          웹 서버가 요청을 처리하는 동안 예상치 못한 데이터베이스 연결 오류 또는 일시적인 시스템 에러가 발생했습니다.
        </p>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          관리자에게 자동으로 오류 내용이 전송되었습니다. 빠른 시간 내에 조치하겠습니다.
        </p>
      </div>
    </div>
  );
}
