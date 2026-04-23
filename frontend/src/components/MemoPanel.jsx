import { useState, useEffect, useRef } from 'react';

export default function MemoPanel({ chapterId }) {
  const storageKey = `memo_${chapterId ?? 'builtin'}`;
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });
  const saveTimer = useRef(null);

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, val); } catch { /* noop */ }
    }, 500);
  }

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  return (
    <div className="memo-wrap">
      <textarea
        className="memo-textarea"
        value={text}
        onChange={handleChange}
        placeholder="자유롭게 메모하세요. 자동 저장됩니다."
        spellCheck={false}
      />
      <div className="memo-footer">
        <span className="memo-char-count">{text.length}자</span>
        <button className="fc-btn-sm" onClick={() => { setText(''); localStorage.removeItem(storageKey); }}>
          전체 삭제
        </button>
      </div>
    </div>
  );
}
