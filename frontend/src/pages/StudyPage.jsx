import { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

const KATEX_OPTIONS = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '$',  right: '$',  display: false },
  ],
  throwOnError: false,
};

// ─── 서식 툴바 ───
function SummaryToolbar({ editorRef }) {
  function cmd(command, value = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }
  function wrapFontSize(size) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement('span');
    span.style.fontSize = size + 'px';
    try { range.surroundContents(span); } catch { /* 크로스노드 선택 무시 */ }
  }

  return (
    <div className="sum-toolbar">
      <button className="sum-tb-btn" title="굵게 (Ctrl+B)"
        onMouseDown={e => { e.preventDefault(); cmd('bold'); }}>
        <strong>B</strong>
      </button>
      <button className="sum-tb-btn" title="기울임 (Ctrl+I)"
        style={{ fontStyle: 'italic' }}
        onMouseDown={e => { e.preventDefault(); cmd('italic'); }}>
        I
      </button>
      <button className="sum-tb-btn" title="밑줄 (Ctrl+U)"
        style={{ textDecoration: 'underline' }}
        onMouseDown={e => { e.preventDefault(); cmd('underline'); }}>
        U
      </button>
      <button className="sum-tb-btn" title="취소선"
        style={{ textDecoration: 'line-through' }}
        onMouseDown={e => { e.preventDefault(); cmd('strikeThrough'); }}>
        S
      </button>

      <span className="sum-tb-sep" />

      <select className="sum-tb-select" title="글꼴"
        onChange={e => { cmd('fontName', e.target.value); }}
        defaultValue="inherit">
        <option value="inherit">기본 글꼴</option>
        <option value="Georgia, serif">Serif</option>
        <option value="monospace">Mono</option>
      </select>

      <select className="sum-tb-select sum-tb-size" title="글자 크기"
        onChange={e => { wrapFontSize(e.target.value); }}
        defaultValue="">
        <option value="" disabled>크기</option>
        {[10,12,13,14,16,18,20,24,28,32].map(s =>
          <option key={s} value={s}>{s}</option>
        )}
      </select>

      <span className="sum-tb-sep" />

      <label className="sum-tb-color-wrap" title="글자 색">
        <span className="sum-tb-color-label">A</span>
        <input type="color" defaultValue="#000000"
          onChange={e => { cmd('foreColor', e.target.value); }} />
      </label>

      <label className="sum-tb-color-wrap" title="형광펜">
        <span className="sum-tb-color-label sum-tb-hl">H</span>
        <input type="color" defaultValue="#fef08a"
          onChange={e => { cmd('hiliteColor', e.target.value); }} />
      </label>

      <span className="sum-tb-sep" />

      <button className="sum-tb-btn" title="글머리 기호"
        onMouseDown={e => { e.preventDefault(); cmd('insertUnorderedList'); }}>
        • 목록
      </button>
      <button className="sum-tb-btn" title="번호 목록"
        onMouseDown={e => { e.preventDefault(); cmd('insertOrderedList'); }}>
        1. 목록
      </button>

      <span className="sum-tb-sep" />

      <button className="sum-tb-btn" title="실행 취소"
        onMouseDown={e => { e.preventDefault(); cmd('undo'); }}>
        ↩
      </button>
      <button className="sum-tb-btn" title="다시 실행"
        onMouseDown={e => { e.preventDefault(); cmd('redo'); }}>
        ↪
      </button>
    </div>
  );
}

// ─── 요약 패널 (편집 가능) ───
function SummaryPanel({ html, chapterId }) {
  const editorRef  = useRef(null);
  const storageKey = `study_edited_${chapterId ?? 'builtin'}`;

  useEffect(() => {
    if (!editorRef.current) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      editorRef.current.innerHTML = saved;
    } else {
      editorRef.current.innerHTML = DOMPurify.sanitize(html || '');
      renderMathInElement(editorRef.current, KATEX_OPTIONS);
    }
  }, [html, storageKey]);

  function handleBlur() {
    if (!editorRef.current) return;
    try { localStorage.setItem(storageKey, editorRef.current.innerHTML); } catch { /* noop */ }
  }

  return (
    <div className="summary-panel-wrap">
      <SummaryToolbar editorRef={editorRef} />
      <div
        ref={editorRef}
        className="summary-editable"
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        spellCheck={false}
      />
    </div>
  );
}

// ─── 메인 ───
export default function StudyPage({ chapter, chapterId, onBack, onSwitchToProblem }) {
  const title         = chapter?.title ?? '극한 §1.4–1.6';
  const summary       = chapter?.summary ?? null;
  const extractedText = chapter?.extractedText ?? null;
  const source        = chapter?.source ?? null;
  const id            = chapterId ?? chapter?.id ?? 'builtin';

  // leftPct: 0=요약만, 100=원본만, 50=반반
  const [leftPct, setLeftPct] = useState(summary ? 45 : 100);
  const containerRef = useRef(null);
  const dragging     = useRef(false);

  const showOrig = leftPct > 2;
  const showSum  = leftPct < 98;

  const onDividerMouseDown = useCallback(e => {
    dragging.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      setLeftPct(pct);
    }
    function onMouseUp() {
      if (!dragging.current) return;
      dragging.current = false;
      setLeftPct(prev => {
        if (prev < 8)  return 0;
        if (prev > 92) return 100;
        return prev;
      });
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  function toggleOrig() { setLeftPct(p => p <= 2  ? 45 : 0); }
  function toggleSum()  { setLeftPct(p => p >= 98 ? 55 : 100); }

  return (
    <div className="study-v2">
      {/* ── 네비 ── */}
      <nav className="study-nav-v2">
        <div className="study-nav-left">
          <button className="btn-back" onClick={onBack}>← Home</button>
          <button className="mode-tab mode-tab-active">📖 공부</button>
          <button className="mode-tab" onClick={onSwitchToProblem}>✏️ 문제</button>
          <span className="chapter-label">{title}</span>
        </div>
        <div className="study-nav-right">
          <button
            className={`panel-toggle-btn ${showOrig ? 'ptb-active' : ''}`}
            onClick={toggleOrig}
            title="원본 보기/숨기기"
          >📄 원본</button>
          <button
            className={`panel-toggle-btn ${showSum ? 'ptb-active' : ''}`}
            onClick={toggleSum}
            title="요약 보기/숨기기"
          >✦ 요약</button>
        </div>
      </nav>

      {/* ── 패널 ── */}
      <div className="study-panels-v2" ref={containerRef}>

        {/* 원본 */}
        {showOrig && (
          <div
            className="study-panel-v2"
            style={{ width: !showSum ? '100%' : `calc(${leftPct}% - 3px)` }}
          >
            <div className="study-panel-header">
              <span>📄 원본 파일</span>
              <button className="panel-close-btn" onClick={() => setLeftPct(0)}>✕</button>
            </div>
            <div className="study-panel-body">
              {extractedText ? (
                <pre className="orig-text">{extractedText}</pre>
              ) : (
                <div className="original-placeholder">
                  <div className="orig-icon">📎</div>
                  <p className="orig-filename">{source ?? 'Stewart Calculus §1.4–1.6'}</p>
                  <p className="orig-note">
                    원본 텍스트가 저장되지 않았습니다.<br />
                    PDF를 다시 업로드하면 원본을 볼 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 드래그 핸들 */}
        {showOrig && showSum && (
          <div className="study-divider-v2" onMouseDown={onDividerMouseDown} />
        )}

        {/* 요약 */}
        {showSum && (
          <div
            className="study-panel-v2"
            style={{ width: !showOrig ? '100%' : `calc(${100 - leftPct}% - 3px)` }}
          >
            <div className="study-panel-header">
              <span>✦ AI 요약</span>
              <button className="panel-close-btn" onClick={() => setLeftPct(100)}>✕</button>
            </div>
            {summary ? (
              <SummaryPanel html={summary} chapterId={id} />
            ) : (
              <div className="study-panel-body">
                <div className="original-placeholder">
                  <p className="orig-note">이 챕터에는 AI 요약이 없습니다.<br />PDF를 업로드하면 자동 생성됩니다.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 둘 다 닫힘 */}
        {!showOrig && !showSum && (
          <div className="study-all-closed">
            <p>모든 패널이 닫혔습니다</p>
            <button className="btn-browse" onClick={() => setLeftPct(45)}>패널 다시 열기</button>
          </div>
        )}
      </div>
    </div>
  );
}
