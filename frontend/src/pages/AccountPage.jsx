import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
];

export default function AccountPage({ onBack }) {
  const { user, profile, logout, updateLanguage,
          checkUploadLimit, checkHintLimit, UPLOAD_LIMIT, HINT_LIMIT } = useAuth();
  const [langSaving,       setLangSaving]       = useState(false);
  const [uidCopied,        setUidCopied]        = useState(false);
  const [uploadRemaining,  setUploadRemaining]  = useState(null);
  const [hintRemaining,    setHintRemaining]    = useState(null);

  useEffect(() => {
    (async () => {
      const ul = await checkUploadLimit();
      const hl = await checkHintLimit();
      setUploadRemaining(ul.remaining);
      setHintRemaining(hl.remaining === Infinity ? HINT_LIMIT : hl.remaining);
    })();
  }, []);

  async function handleLangChange(e) {
    setLangSaving(true);
    await updateLanguage(e.target.value);
    setLangSaving(false);
  }

  async function handleLogout() {
    await logout();
    onBack();
  }

  function copyUid() {
    navigator.clipboard.writeText(user?.uid ?? '');
    setUidCopied(true);
    setTimeout(() => setUidCopied(false), 1500);
  }

  const plan = profile?.subscription?.plan ?? 'free';
  const uid  = user?.uid ?? '';

  return (
    <div className="account-page">
      <div className="account-header">
        <button className="btn-back" onClick={onBack}>← 돌아가기</button>
        <h1 className="account-title">내 계정</h1>
      </div>

      <div className="account-body">

        {/* ── 왼쪽: 계정 정보 ── */}
        <div className="account-card">
          <h2 className="account-card-title">계정 정보</h2>

          <div className="account-row">
            <span className="account-label">이메일</span>
            <span className="account-value">{user?.email ?? '—'}</span>
          </div>

          <div className="account-row">
            <span className="account-label">이름</span>
            <span className="account-value">{user?.displayName || '—'}</span>
          </div>

          <div className="account-row account-row-uid">
            <span className="account-label">User ID</span>
            <span className="account-uid" title={uid}>{uid.slice(0, 16)}…</span>
            <button className="btn-copy-uid" onClick={copyUid}>
              {uidCopied ? '✓ 복사됨' : '복사'}
            </button>
          </div>

          <div className="account-row">
            <span className="account-label">언어</span>
            <select
              className="account-lang-select"
              value={profile?.language ?? 'ko'}
              onChange={handleLangChange}
              disabled={langSaving}
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            {langSaving && <span className="account-saving">저장 중...</span>}
          </div>

          <button className="btn-logout" onClick={handleLogout}>로그아웃</button>
        </div>

        {/* ── 오른쪽: 구독 상태 ── */}
        <div className="account-card">
          <h2 className="account-card-title">구독 상태</h2>

          <div className={`plan-badge plan-${plan}`}>
            {plan === 'free' ? 'Free' : 'Premium'}
          </div>

          {plan === 'free' ? (
            <>
              <p className="plan-desc">현재 무료 플랜을 이용 중입니다.</p>
              <ul className="plan-limits">
                <li>PDF 업로드 월 {UPLOAD_LIMIT}회
                  {uploadRemaining !== null && (
                    <span className="usage-remaining"> (이번 달 {uploadRemaining}회 남음)</span>
                  )}
                </li>
                <li>문제 풀기 무제한</li>
                <li>AI 힌트 하루 {HINT_LIMIT}회
                  {hintRemaining !== null && (
                    <span className="usage-remaining"> (오늘 {hintRemaining}회 남음)</span>
                  )}
                </li>
              </ul>

              <div className="plan-upgrade-box">
                <p className="plan-upgrade-title">Premium으로 업그레이드</p>
                <ul className="plan-perks">
                  <li>✓ PDF 업로드 무제한</li>
                  <li>✓ AI 힌트 무제한</li>
                  <li>✓ AI 교차검증 강화</li>
                  <li>✓ 우선 고객 지원</li>
                </ul>
                <button className="btn-upgrade" disabled>
                  곧 출시 예정 🚀
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="plan-desc">Premium 플랜을 이용 중입니다. 감사합니다!</p>
              <ul className="plan-perks">
                <li>✓ PDF 업로드 무제한</li>
                <li>✓ AI 힌트 무제한</li>
                <li>✓ AI 교차검증 강화</li>
                <li>✓ 우선 고객 지원</li>
              </ul>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
