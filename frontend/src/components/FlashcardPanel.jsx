import { useState, useEffect, useRef } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { generateFlashcards } from '../api/client';

const KATEX_OPTIONS = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '$',  right: '$',  display: false },
    { left: '\\(', right: '\\)', display: false },
  ],
  throwOnError: false,
};

function CardFace({ text, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) renderMathInElement(ref.current, KATEX_OPTIONS);
  }, [text]);
  return <div ref={ref} className={className}>{text}</div>;
}

export default function FlashcardPanel({ chapter, chapterId }) {
  const storageKey = `flashcards_${chapterId ?? 'builtin'}`;

  const [cards,     setCards]     = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') ?? []; } catch { return []; }
  });
  const [idx,       setIdx]       = useState(0);
  const [flipped,   setFlipped]   = useState(false);
  const [known,     setKnown]     = useState(new Set());   // 알아요
  const [generating, setGenerating] = useState(false);
  const [error,     setError]     = useState('');
  const [shuffled,  setShuffled]  = useState(false);
  const [order,     setOrder]     = useState([]);          // 현재 카드 순서 (인덱스 배열)

  // 순서 초기화
  useEffect(() => {
    setOrder(cards.map((_, i) => i));
    setIdx(0); setFlipped(false); setKnown(new Set());
  }, [cards]);

  const hasCards   = cards.length > 0;
  const hasSummary = !!(chapter?.summary);
  const realIdx    = order[idx] ?? 0;
  const card       = cards[realIdx];
  const total      = order.length;

  async function handleGenerate() {
    if (!hasSummary || generating) return;
    setGenerating(true); setError('');
    try {
      const result = await generateFlashcards({
        summary: chapter.summary,
        title:   chapter.title ?? '',
        count:   14,
      });
      setCards(result);
      try { localStorage.setItem(storageKey, JSON.stringify(result)); } catch { /* noop */ }
    } catch (e) {
      setError(e.response?.data?.detail || e.message || '생성 실패');
    } finally { setGenerating(false); }
  }

  function handleShuffle() {
    const arr = [...order];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrder(arr); setIdx(0); setFlipped(false); setShuffled(true);
  }

  function handleReset() {
    setOrder(cards.map((_, i) => i));
    setIdx(0); setFlipped(false); setKnown(new Set()); setShuffled(false);
  }

  function markKnown() {
    setKnown(prev => new Set([...prev, realIdx]));
    next();
  }

  function next() {
    setFlipped(false);
    setTimeout(() => setIdx(i => Math.min(i + 1, total - 1)), 150);
  }
  function prev() {
    setFlipped(false);
    setTimeout(() => setIdx(i => Math.max(i - 1, 0)), 150);
  }

  if (!hasCards) {
    return (
      <div className="fc-empty">
        {!hasSummary ? (
          <p className="orig-note">AI 요약이 있어야 플래시카드를 만들 수 있어요.<br />PDF를 업로드하면 자동 생성됩니다.</p>
        ) : (
          <>
            <p className="orig-note">플래시카드가 아직 없어요.<br />AI가 요약에서 핵심 개념을 뽑아줄게요.</p>
            {error && <p className="add-problem-error">{error}</p>}
            <button className="btn-dialog-submit" onClick={handleGenerate} disabled={generating}>
              {generating ? '생성 중...' : '플래시카드 만들기'}
            </button>
          </>
        )}
      </div>
    );
  }

  const allDone = idx >= total - 1 && flipped !== null;
  const knownCount = known.size;

  return (
    <div className="fc-wrap">
      {/* 상단 바 */}
      <div className="fc-topbar">
        <span className="fc-progress">{idx + 1} / {total}</span>
        <div className="fc-topbar-actions">
          {knownCount > 0 && (
            <span className="fc-known-badge">✓ {knownCount}개 완료</span>
          )}
          <button className="fc-btn-sm" onClick={handleShuffle} title="셔플">⇄ 섞기</button>
          <button className="fc-btn-sm" onClick={handleReset} title="처음으로">↺ 초기화</button>
          <button className="fc-btn-sm" onClick={handleGenerate} disabled={generating} title="재생성">
            {generating ? '...' : '↻ 재생성'}
          </button>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="fc-progressbar">
        <div className="fc-progressbar-fill" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      {/* 카드 */}
      <div
        className={`fc-card-scene`}
        onClick={() => setFlipped(f => !f)}
      >
        <div className={`fc-card ${flipped ? 'flipped' : ''} ${known.has(realIdx) ? 'fc-card-known' : ''}`}>
          <div className="fc-card-front">
            <span className="fc-card-label">개념</span>
            <CardFace text={card.front} className="fc-card-text" />
            <span className="fc-tap-hint">탭하여 뒤집기</span>
          </div>
          <div className="fc-card-back">
            <span className="fc-card-label">설명</span>
            <CardFace text={card.back} className="fc-card-text" />
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="fc-actions">
        <button className="fc-btn-prev" onClick={prev} disabled={idx === 0}>‹</button>
        {flipped ? (
          <>
            <button className="fc-btn-unknown" onClick={next} disabled={idx >= total - 1}>
              다시 볼게요
            </button>
            <button className="fc-btn-known" onClick={markKnown}>
              알아요 ✓
            </button>
          </>
        ) : (
          <button className="fc-btn-flip" onClick={() => setFlipped(true)}>
            뒤집기
          </button>
        )}
        <button className="fc-btn-next" onClick={next} disabled={idx >= total - 1}>›</button>
      </div>

      {/* 완료 메시지 */}
      {idx >= total - 1 && known.size > 0 && (
        <p className="fc-done-msg">
          {known.size === total ? '🎉 전부 완료했어요!' : `${known.size}/${total}개 완료. 다시 복습해볼까요?`}
        </p>
      )}
    </div>
  );
}
