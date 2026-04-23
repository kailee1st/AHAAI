import { useState, useRef, useEffect, useCallback } from 'react';
import StudyContent from '../components/StudyContent';

export default function StudyPage({ chapter, chapterId, onBack, onSwitchToProblem }) {
  const title         = chapter?.title ?? '극한 §1.4–1.6';
  const extractedText = chapter?.extractedText ?? null;
  const pdfUrl        = chapter?.pdfUrl ?? null;
  const source        = chapter?.source ?? null;

  // leftPct: 0=공부콘텐츠만, 100=원본만, 50=반반
  const [leftPct, setLeftPct] = useState(chapter?.summary ? 45 : 100);
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
          <button className={`panel-toggle-btn ${showOrig ? 'ptb-active' : ''}`} onClick={toggleOrig} title="원본 보기/숨기기">📄 원본</button>
          <button className={`panel-toggle-btn ${showSum  ? 'ptb-active' : ''}`} onClick={toggleSum}  title="공부 패널 보기/숨기기">📖 공부</button>
        </div>
      </nav>

      {/* ── 패널 ── */}
      <div className="study-panels-v2" ref={containerRef}>

        {/* 원본 */}
        {showOrig && (
          <div className="study-panel-v2" style={{ width: !showSum ? '100%' : `calc(${leftPct}% - 3px)` }}>
            <div className="study-panel-header">
              <span>📄 원본 파일</span>
              <button className="panel-close-btn" onClick={() => setLeftPct(0)}>✕</button>
            </div>
            <div className="study-panel-body study-panel-body-pdf">
              {pdfUrl ? (
                <iframe className="pdf-iframe" src={pdfUrl} title="PDF 미리보기" />
              ) : extractedText ? (
                <pre className="orig-text">{extractedText}</pre>
              ) : (
                <div className="original-placeholder">
                  <div className="orig-icon">📎</div>
                  <p className="orig-filename">{source ?? 'Stewart Calculus §1.4–1.6'}</p>
                  <p className="orig-note">원본 텍스트가 저장되지 않았습니다.<br />PDF를 다시 업로드하면 원본을 볼 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 드래그 핸들 */}
        {showOrig && showSum && (
          <div className="study-divider-v2" onMouseDown={onDividerMouseDown} />
        )}

        {/* 공부 콘텐츠 */}
        {showSum && (
          <div className="study-panel-v2" style={{ width: !showOrig ? '100%' : `calc(${100 - leftPct}% - 3px)` }}>
            <div className="study-panel-header">
              <span>📖 공부</span>
              <button className="panel-close-btn" onClick={() => setLeftPct(100)}>✕</button>
            </div>
            <StudyContent chapter={chapter} chapterId={chapterId} />
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
