import { useState } from 'react';

export default function YouTubeModal({ onSubmit, onClose }) {
  const [url,   setUrl]   = useState('');
  const [error, setError] = useState('');

  const isValid = /(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/.test(url.trim());

  function handleSubmit() {
    if (!isValid) { setError('유효한 YouTube URL을 입력해주세요.'); return; }
    onSubmit({ url: url.trim() });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card youtube-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>▶️ YouTube 강의</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="blank-modal-body">
          <label className="blank-label">YouTube URL</label>
          <p className="blank-hint-text">
            자막이 있는 영상만 지원합니다. (한국어/영어 자막 자동 선택)<br />
            강의, 설명 영상 등 학습 콘텐츠에 적합합니다.
          </p>
          <input
            className="blank-title-input"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {url && !isValid && (
            <p className="blank-hint-text" style={{ color: '#DC2626' }}>YouTube URL 형식이 아닙니다.</p>
          )}
          {error && <p className="add-problem-error">{error}</p>}
        </div>

        <div className="add-problem-footer">
          <button className="btn-dialog-cancel" onClick={onClose}>취소</button>
          <button
            className="btn-dialog-submit"
            disabled={!isValid}
            onClick={handleSubmit}
          >
            자막 추출 및 생성
          </button>
        </div>
      </div>
    </div>
  );
}
