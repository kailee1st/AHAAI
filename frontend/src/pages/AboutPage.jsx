import { useAuth } from '../context/AuthContext';

export default function AboutPage({ onLoginClick }) {
  const { user } = useAuth();

  return (
    <div className="about-page">
      <div className="about-hero">
        <span className="about-logo">✦</span>
        <h1 className="about-title">Aha Moment AI</h1>
        <p className="about-tagline">수학·물리 교재를 업로드하면, AI가 문제를 만들고 소크라테스식으로 가르쳐줍니다.</p>
        {!user && (
          <button className="btn-primary about-cta" onClick={onLoginClick}>
            지금 시작하기
          </button>
        )}
      </div>

      <div className="about-features">
        <div className="about-feature-card">
          <span className="feature-icon">📄</span>
          <h3>PDF · YouTube · 직접 입력</h3>
          <p>교재 PDF, 강의 영상 URL, 또는 텍스트를 직접 붙여넣어 나만의 학습 자료를 만드세요.</p>
        </div>
        <div className="about-feature-card">
          <span className="feature-icon">✏️</span>
          <h3>AI 문제 자동 생성</h3>
          <p>Claude AI가 자료를 분석해 핵심 개념을 짚는 문제를 자동으로 만들어줍니다.</p>
        </div>
        <div className="about-feature-card">
          <span className="feature-icon">💡</span>
          <h3>소크라테스식 힌트</h3>
          <p>막힐 때 AI 튜터가 답을 직접 알려주지 않고, 스스로 깨달을 수 있도록 질문으로 안내합니다.</p>
        </div>
        <div className="about-feature-card">
          <span className="feature-icon">🃏</span>
          <h3>플래시카드 · 메모</h3>
          <p>요약된 핵심 개념을 플래시카드로 복습하고, 자유롭게 메모를 남겨 지식을 내 것으로 만드세요.</p>
        </div>
      </div>

      <div className="about-footer-note">
        <p>
          피드백이나 문의는{' '}
          <a href="mailto:kailee1st@gmail.com" className="about-link">kailee1st@gmail.com</a>
          으로 보내주세요.
        </p>
      </div>
    </div>
  );
}
