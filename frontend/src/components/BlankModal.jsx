import { useState } from 'react';

export default function BlankModal({ onSubmit, onClose }) {
  const [title, setTitle]     = useState('');
  const [text,  setText]      = useState('');
  const [error, setError]     = useState('');

  const canSubmit = title.trim().length > 0 && text.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    if (text.trim().length < 50) { setError('내용을 50자 이상 입력해주세요.'); return; }
    onSubmit({ title: title.trim(), text: text.trim() });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card blank-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 직접 작성</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="blank-modal-body">
          <label className="blank-label">제목</label>
          <input
            className="blank-title-input"
            placeholder="예: 선형대수 5장 요약, 미적분 개념 정리..."
            value={title}
            onChange={e => { setTitle(e.target.value); setError(''); }}
            maxLength={80}
          />

          <label className="blank-label">내용</label>
          <p className="blank-hint-text">
            개념 설명, 수식, 문제 등 자유롭게 작성하세요.<br />
            작성한 내용을 바탕으로 문제와 요약본이 생성됩니다.
          </p>
          <textarea
            className="blank-textarea"
            placeholder="여기에 학습 내용을 작성하세요..."
            value={text}
            onChange={e => { setText(e.target.value); setError(''); }}
            rows={14}
          />
          <div className="blank-char-count">{text.length.toLocaleString()}자</div>

          {error && <p className="add-problem-error">{error}</p>}
        </div>

        <div className="add-problem-footer">
          <button className="btn-dialog-cancel" onClick={onClose}>취소</button>
          <button
            className="btn-dialog-submit"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            생성 시작
          </button>
        </div>
      </div>
    </div>
  );
}
