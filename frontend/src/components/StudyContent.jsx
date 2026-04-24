import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import FlashcardPanel from './FlashcardPanel';
import MemoPanel from './MemoPanel';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

const KATEX_OPTIONS = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$',  right: '$',  display: false },
    { left: '\\(', right: '\\)', display: false },
  ],
  throwOnError: false,
};

const TEXT_COLORS      = ['#000000','#374151','#DC2626','#D97706','#16A34A','#2563EB','#7C3AED','#DB2777'];
const HIGHLIGHT_COLORS = ['transparent','#FEF08A','#BBF7D0','#BFDBFE','#FECACA','#E9D5FF','#FED7AA'];

function ColorPalette({ colors, onSelect, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sum-tb-palette-wrap">
      <button className="sum-tb-btn" title={label}
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}>
        {label}
      </button>
      {open && (
        <div className="sum-tb-palette">
          {colors.map(c => (
            <button key={c} className="sum-tb-swatch"
              style={{ background: c === 'transparent' ? 'white' : c, border: c === 'transparent' ? '2px dashed #ccc' : '2px solid transparent' }}
              onMouseDown={e => { e.preventDefault(); onSelect(c); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
      <button className="sum-tb-btn" title="굵게" onMouseDown={e => { e.preventDefault(); cmd('bold'); }}><strong>B</strong></button>
      <button className="sum-tb-btn" title="기울임" style={{ fontStyle: 'italic' }} onMouseDown={e => { e.preventDefault(); cmd('italic'); }}>I</button>
      <button className="sum-tb-btn" title="밑줄" style={{ textDecoration: 'underline' }} onMouseDown={e => { e.preventDefault(); cmd('underline'); }}>U</button>
      <button className="sum-tb-btn" title="취소선" style={{ textDecoration: 'line-through' }} onMouseDown={e => { e.preventDefault(); cmd('strikeThrough'); }}>S</button>
      <span className="sum-tb-sep" />
      <select className="sum-tb-select" title="글꼴" onChange={e => cmd('fontName', e.target.value)} defaultValue="inherit">
        <option value="inherit">기본 글꼴</option>
        <option value="Georgia, serif">Serif</option>
        <option value="monospace">Mono</option>
      </select>
      <select className="sum-tb-select sum-tb-size" title="글자 크기" onChange={e => wrapFontSize(e.target.value)} defaultValue="">
        <option value="" disabled>크기</option>
        {[10,12,14,16,18,20,24,28,32].map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <span className="sum-tb-sep" />
      <ColorPalette label="A 색" colors={TEXT_COLORS} onSelect={c => cmd('foreColor', c)} />
      <ColorPalette label="H 형광" colors={HIGHLIGHT_COLORS} onSelect={c => cmd('hiliteColor', c === 'transparent' ? 'transparent' : c)} />
      <span className="sum-tb-sep" />
      <button className="sum-tb-btn" title="글머리 기호" onMouseDown={e => { e.preventDefault(); cmd('insertUnorderedList'); }}>• 목록</button>
      <button className="sum-tb-btn" title="번호 목록" onMouseDown={e => { e.preventDefault(); cmd('insertOrderedList'); }}>1. 목록</button>
      <span className="sum-tb-sep" />
      <button className="sum-tb-btn" title="실행 취소" onMouseDown={e => { e.preventDefault(); cmd('undo'); }}>↩</button>
      <button className="sum-tb-btn" title="다시 실행" onMouseDown={e => { e.preventDefault(); cmd('redo'); }}>↪</button>
    </div>
  );
}

function SummaryPanel({ html, chapterId }) {
  const editorRef  = useRef(null);
  const storageKey = `study_edited_${chapterId ?? 'builtin'}`;

  useEffect(() => {
    if (!editorRef.current) return;
    const saved = localStorage.getItem(storageKey);
    editorRef.current.innerHTML = saved ?? DOMPurify.sanitize(html || '');
    if (!saved) renderMathInElement(editorRef.current, KATEX_OPTIONS);
  }, [html, storageKey]);

  function handleBlur() {
    if (!editorRef.current) return;
    try { localStorage.setItem(storageKey, editorRef.current.innerHTML); } catch { /* noop */ }
  }

  return (
    <div className="summary-panel-wrap">
      <SummaryToolbar editorRef={editorRef} />
      <div ref={editorRef} className="summary-editable"
        contentEditable suppressContentEditableWarning
        onBlur={handleBlur} spellCheck={false} />
    </div>
  );
}

// ─── 탭 목록 — 새 기능 추가 시 여기에만 추가 ───
const TABS = [
  { id: 'original',  label: '📄 원본' },
  { id: 'summary',   label: '✦ 요약' },
  { id: 'flashcard', label: '🃏 플래시카드' },
  { id: 'memo',      label: '📝 메모' },
  // { id: 'mindmap', label: '🗺 마인드맵' },
];

// showOriginal=false이면 원본 탭 숨김 (문제모드 패널 등)
export default function StudyContent({ chapter, chapterId, showOriginal = true }) {
  const summary       = chapter?.summary ?? null;
  const extractedText = chapter?.extractedText ?? null;
  const pdfUrl        = chapter?.pdfUrl ?? null;
  const source        = chapter?.source ?? null;
  const id            = chapterId ?? chapter?.id ?? 'builtin';

  const visibleTabs = showOriginal ? TABS : TABS.filter(t => t.id !== 'original');
  const [activeTab, setActiveTab] = useState(showOriginal ? 'original' : 'summary');

  return (
    <div className="study-content">
      {/* 탭 바 */}
      <div className="study-content-tabs">
        {visibleTabs.map(t => (
          <button key={t.id}
            className={`study-content-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="study-content-body">
        {activeTab === 'original' && (
          <div className="study-panel-body study-panel-body-pdf">
            {pdfUrl ? (
              <iframe className="pdf-iframe" src={pdfUrl} title="PDF 미리보기" />
            ) : extractedText ? (
              <pre className="orig-text">{extractedText}</pre>
            ) : (
              <div className="original-placeholder">
                <div className="orig-icon">📎</div>
                <p className="orig-filename">{source ?? ''}</p>
                <p className="orig-note">원본 텍스트가 저장되지 않았습니다.</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'summary' && (
          summary
            ? <SummaryPanel html={summary} chapterId={id} />
            : <div className="original-placeholder">
                <p className="orig-note">이 챕터에는 AI 요약이 없습니다.<br />PDF를 업로드하면 자동 생성됩니다.</p>
              </div>
        )}
        {activeTab === 'flashcard' && (
          <FlashcardPanel chapter={chapter} chapterId={id} />
        )}
        {activeTab === 'memo' && (
          <MemoPanel chapterId={id} />
        )}
      </div>
    </div>
  );
}
