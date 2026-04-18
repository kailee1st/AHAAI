import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: 8, flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function LoginModal({ onClose }) {
  const { loginWithGoogle, register, login } = useAuth();
  const [tab,     setTab]     = useState('create'); // 'create' | 'signin'
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // 계정 만들기 필드
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [pw2,     setPw2]     = useState('');

  // 로그인 필드
  const [siEmail, setSiEmail] = useState('');
  const [siPw,    setSiPw]    = useState('');

  function switchTab(t) { setTab(t); setError(''); }

  async function handleGoogle() {
    setError(''); setLoading(true);
    try { await loginWithGoogle(); onClose(); }
    catch (e) { setError('Google 로그인에 실패했습니다.'); }
    finally { setLoading(false); }
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !pw) { setError('모든 항목을 입력해주세요'); return; }
    if (pw !== pw2) { setError('비밀번호가 일치하지 않습니다'); return; }
    if (pw.length < 6) { setError('비밀번호는 6자 이상이어야 합니다'); return; }
    setError(''); setLoading(true);
    try { await register(email.trim(), pw, name.trim()); onClose(); }
    catch (e) {
      setError(
        e.code === 'auth/email-already-in-use' ? '이미 사용 중인 이메일입니다' :
        e.code === 'auth/invalid-email'         ? '올바른 이메일 형식이 아닙니다' :
        '계정 생성에 실패했습니다'
      );
    }
    finally { setLoading(false); }
  }

  async function handleSignIn() {
    if (!siEmail.trim() || !siPw) { setError('이메일과 비밀번호를 입력해주세요'); return; }
    setError(''); setLoading(true);
    try { await login(siEmail.trim(), siPw); onClose(); }
    catch (e) {
      setError(
        e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' ||
        e.code === 'auth/invalid-credential'
          ? '이메일 또는 비밀번호가 올바르지 않습니다'
          : '로그인에 실패했습니다'
      );
    }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <button className="login-modal-close" onClick={onClose}>✕</button>

        <div className="login-modal-brand">
          <span className="brand-icon">✦</span> Aha Moment AI
        </div>

        {/* Google 로그인 */}
        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <GoogleIcon />
          Google로 계속하기
        </button>

        <div className="login-divider"><span>또는</span></div>

        {/* 탭 전환 */}
        <div className="login-tabs">
          <button className={`login-tab-btn ${tab === 'create' ? 'active' : ''}`} onClick={() => switchTab('create')}>
            계정 만들기
          </button>
          <button className={`login-tab-btn ${tab === 'signin' ? 'active' : ''}`} onClick={() => switchTab('signin')}>
            Sign In
          </button>
        </div>

        {/* 계정 만들기 */}
        {tab === 'create' && (
          <div className="login-form">
            <input className="login-field" placeholder="이름" value={name}  onChange={e => setName(e.target.value)} />
            <input className="login-field" placeholder="이메일" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="login-field" placeholder="비밀번호" type="password" value={pw}  onChange={e => setPw(e.target.value)} />
            <input className="login-field" placeholder="비밀번호 확인" type="password" value={pw2} onChange={e => setPw2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            {error && <p className="login-error">{error}</p>}
            <button className="btn-login-primary" onClick={handleRegister} disabled={loading}>
              {loading ? '처리 중...' : '계정 만들기'}
            </button>
          </div>
        )}

        {/* 로그인 */}
        {tab === 'signin' && (
          <div className="login-form">
            <input className="login-field" placeholder="이메일" type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} />
            <input className="login-field" placeholder="비밀번호" type="password" value={siPw} onChange={e => setSiPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
            {error && <p className="login-error">{error}</p>}
            <button className="btn-login-primary" onClick={handleSignIn} disabled={loading}>
              {loading ? '처리 중...' : 'Sign In'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
