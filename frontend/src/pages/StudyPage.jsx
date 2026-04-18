import { useState, useRef, useEffect } from 'react';
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

function SummaryContent({ html }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = DOMPurify.sanitize(html);
      renderMathInElement(ref.current, KATEX_OPTIONS);
    }
  }, [html]);
  return <div ref={ref} className="summary-body-inner" />;
}

export default function StudyPage({ chapter, onBack, onSwitchToProblem }) {
  const [showOriginal, setShowOriginal] = useState(true);
  const [showSummary,  setShowSummary]  = useState(true);

  const title   = chapter?.title   ?? '극한 §1.4–1.6';
  const summary = chapter?.summary ?? null;
  const source  = chapter?.source  ?? null;

  const bothOpen    = showOriginal && showSummary;
  const noneOpen    = !showOriginal && !showSummary;

  return (
    <div className="study-page">
      {/* ── 모드 스위처 ── */}
      <nav className="mode-switcher">
        <button className="btn-back" onClick={onBack}>← Home</button>
        <button className="mode-tab mode-tab-active">📖 공부</button>
        <button className="mode-tab" onClick={onSwitchToProblem}>✏️ 문제</button>
        <span className="chapter-label">{title}</span>
      </nav>

      {/* ── 패널 컨테이너 ── */}
      {noneOpen ? (
        <div className="panels-all-closed">
          <p>모든 패널이 닫혔습니다</p>
          <button className="btn-browse" onClick={() => { setShowOriginal(true); setShowSummary(true); }}>
            패널 다시 열기
          </button>
        </div>
      ) : (
        <div className={`study-panels ${bothOpen ? 'two-col' : 'one-col'}`}>
          {/* 원본 패널 */}
          {showOriginal && (
            <div className="study-panel">
              <div className="panel-header">
                <span className="panel-title">📄 원본 파일</span>
                <button className="panel-close" onClick={() => setShowOriginal(false)}>✕</button>
              </div>
              <div className="panel-body">
                {source ? (
                  <div className="original-placeholder">
                    <div className="orig-icon">📎</div>
                    <p className="orig-filename">{source}</p>
                    <p className="orig-note">PDF 미리보기는 현재 지원되지 않습니다.<br />옆 요약본을 참고하거나 원본을 직접 열어주세요.</p>
                  </div>
                ) : (
                  <div className="original-placeholder">
                    <div className="orig-icon">📐</div>
                    <p className="orig-filename">Stewart Calculus §1.4–1.6</p>
                    <p className="orig-note">기본 제공 챕터입니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 요약 패널 */}
          {showSummary && (
            <div className="study-panel">
              <div className="panel-header">
                <span className="panel-title">✦ AI 요약</span>
                <button className="panel-close" onClick={() => setShowSummary(false)}>✕</button>
              </div>
              <div className="panel-body summary-panel-body">
                {summary ? (
                  <SummaryContent html={summary} />
                ) : (
                  <div className="original-placeholder">
                    <p className="orig-note">이 챕터에는 AI 요약이 없습니다.<br />PDF를 업로드하면 자동 생성됩니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
