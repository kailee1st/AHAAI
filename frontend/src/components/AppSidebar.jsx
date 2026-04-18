import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export default function AppSidebar({ collapsed, onToggleCollapse, onNavigateHome, onLoginClick, onAccountClick }) {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* TOP */}
      <div className="sidebar-top">
        {!collapsed && (
          <div className="app-brand">
            <span className="brand-icon">✦</span>
            Aha AI
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggleCollapse} title={collapsed ? '펼치기' : '접기'}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* NAV */}
      <div className="sidebar-nav">
        <button
          className="sidebar-nav-item"
          onClick={onNavigateHome}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <span className="nav-icon">🏠</span>
          {!collapsed && <span>Dashboard</span>}
        </button>
      </div>

      {/* BOTTOM */}
      <div className="sidebar-bottom">
        <button className="sidebar-bottom-item" onClick={() => setShowSettings(true)} title="설정">
          <span className="bottom-icon">⚙️</span>
          {!collapsed && <span>설정</span>}
        </button>
        <a
          className="sidebar-bottom-item"
          href="https://github.com/anthropics/claude-code/issues"
          target="_blank" rel="noopener noreferrer"
          title="피드백"
        >
          <span className="bottom-icon">💬</span>
          {!collapsed && <span>피드백 남기기</span>}
        </a>

        {user ? (
          /* 로그인 상태 — 아바타 클릭 시 계정 페이지 */
          <div className="sidebar-user" onClick={onAccountClick} title="계정 보기" style={{ cursor: 'pointer' }}>
            <div className="user-avatar">
              <PersonIcon />
            </div>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">{user.displayName || user.email}</span>
                <span className="user-email">{user.email}</span>
              </div>
            )}
          </div>
        ) : (
          /* 비로그인 — 로그인 버튼 */
          <button className="sidebar-bottom-item" onClick={onLoginClick} title="로그인">
            <span className="bottom-icon">👤</span>
            {!collapsed && <span>로그인</span>}
          </button>
        )}
      </div>

      {/* 설정 모달 */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>설정</h2>
              <button className="btn-icon-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>
              추가 설정 기능이 곧 제공될 예정입니다.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
