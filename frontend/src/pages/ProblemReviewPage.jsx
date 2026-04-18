import { useState, useEffect, useRef, useMemo } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { generateSingleProblem } from '../api/client';
import AddProblemModal from '../components/AddProblemModal';

const KATEX_OPTIONS = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '$',  right: '$',  display: false },
  ],
  throwOnError: false,
};

function ProblemPreview({ latex }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const hasDollar   = /\$/.test(latex);
    const hasLatexCmd = /\\[a-zA-Z]/.test(latex);
    ref.current.textContent = (!hasDollar && hasLatexCmd) ? `$$${latex}$$` : latex;
    renderMathInElement(ref.current, KATEX_OPTIONS);
  }, [latex]);
  return <div ref={ref} className="review-problem-latex" />;
}

export default function ProblemReviewPage({ chapterId, chapter: chapterProp, allChapters = [], onChapterUpdate, onBack, onStart }) {
  // chapterProp이 있으면 직접 사용(데모 챕터 등), 없으면 localStorage에서 로드
  const chapter = useMemo(() => {
    if (chapterProp) return chapterProp;
    if (!chapterId) return null;
    try {
      const uid = (() => { try { return JSON.parse(localStorage.getItem('aha_user') || 'null')?.uid; } catch { return null; } })();
      const key = uid ? `aha_chapters_${uid}` : 'aha_chapters';
      return JSON.parse(localStorage.getItem(key) || '[]').find(c => c.id === chapterId) ?? null;
    } catch { return null; }
  }, [chapterId, chapterProp]);

  const rawProblems = chapter?.problems ?? [];
  const skippedRaw  = chapter?.skipped  ?? [];

  // ── 자료기반 문제 (type 없는 것도 포함) ──
  // completedProblems: 객관식 중 choices 없는 것은 auto-complete 중
  const [allProblems, setAllProblems] = useState(rawProblems);
  // completing: Set of allProblems indices being auto-generated
  const [completing, setCompleting]   = useState(new Set());
  const [completeErr, setCompleteErr] = useState({});

  // 창작문제: chapter.creativeProblems 기반
  const [creativeProblems, setCreativeProblems] = useState(() => chapter?.creativeProblems ?? []);
  const [showAddModal,     setShowAddModal]      = useState(false);

  // 전체 문제를 인덱스로 관리 (유형변형/도전은 백엔드에서 생성하지 않음)
  // allKeys: allProblems 길이가 바뀔 때만 재계산
  const allKeys = useMemo(() => allProblems.map((_, i) => `source_${i}`), [allProblems.length]);
  const [selected, setSelected]           = useState(() => new Set(allKeys));
  const [extraProblems, setExtraProblems] = useState([]);
  const [generating, setGenerating]       = useState(new Set());
  const [genError, setGenError]           = useState({});

  // ── 객관식 자동 완성 (choices 없는 것) — 순차 처리로 rate limit 방지 ──
  useEffect(() => {
    const queue = allProblems
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p.format === '객관식' && !p.choices?.length);
    if (queue.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const { p, idx } of queue) {
        if (cancelled) break;
        setCompleting(prev => new Set(prev).add(idx));
        try {
          const full = await generateSingleProblem({
            originalText: p.promptText || p.latex,
            source: p.source ?? '',
            subject: chapter?.subject ?? '',
          });
          if (!cancelled) {
            setAllProblems(prev => {
              const next = [...prev];
              next[idx] = { ...next[idx], choices: full.choices, correct: full.correct, solution: full.solution };
              return next;
            });
          }
        } catch {
          if (!cancelled) setCompleteErr(prev => ({ ...prev, [idx]: '선택지 생성 실패' }));
        } finally {
          if (!cancelled) setCompleting(prev => { const n = new Set(prev); n.delete(idx); return n; });
        }
        // rate limit 방지: 요청 사이 1초 대기
        await new Promise(r => setTimeout(r, 1000));
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalProblems = allProblems.length + extraProblems.length + creativeProblems.length;
  const allSelected = selected.size === totalProblems;

  // extraProblems의 source를 Set으로 미리 계산 — 렌더 루프 내 O(n) .some() 제거
  const extraSourceSet = useMemo(
    () => new Set(extraProblems.map(p => p.source)),
    [extraProblems]
  );

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      const extraKeys     = extraProblems.map((_, i) => `extra_${i}`);
      const creativeKeys  = creativeProblems.map((_, i) => `creative_${i}`);
      setSelected(new Set([...allKeys, ...extraKeys, ...creativeKeys]));
    }
  }

  // 창작문제 삭제
  function deleteCreativeProblem(idx) {
    const next = creativeProblems.filter((_, i) => i !== idx);
    setCreativeProblems(next);
    // selected 키 재정렬
    setSelected(prev => {
      const next2 = new Set();
      prev.forEach(k => {
        if (!k.startsWith('creative_')) { next2.add(k); return; }
        const n = parseInt(k.replace('creative_', ''));
        if (n < idx) next2.add(k);
        else if (n > idx) next2.add(`creative_${n - 1}`);
      });
      return next2;
    });
    // 챕터 저장
    if (chapter && onChapterUpdate) {
      onChapterUpdate({ ...chapter, creativeProblems: next });
    }
  }

  // 창작문제 추가 완료
  function handleCreativeGenerated(problems) {
    const tagged = problems.map((p, i) => ({
      ...p,
      tag: `창작 ${creativeProblems.length + i + 1}`,
      isCreative: true,
    }));
    const next = [...creativeProblems, ...tagged];
    setCreativeProblems(next);
    // 새로 추가된 것들 자동 선택
    setSelected(prev => {
      const next2 = new Set(prev);
      tagged.forEach((_, i) => next2.add(`creative_${creativeProblems.length + i}`));
      return next2;
    });
    // 챕터 저장
    if (chapter && onChapterUpdate) {
      onChapterUpdate({ ...chapter, creativeProblems: next });
    }
    setShowAddModal(false);
  }

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleInclude(skippedItem, skippedIdx) {
    setGenerating(prev => new Set(prev).add(skippedIdx));
    setGenError(prev => ({ ...prev, [skippedIdx]: null }));
    try {
      const problem = await generateSingleProblem({
        originalText: skippedItem.original_text,
        source: skippedItem.source,
        subject: chapter?.subject ?? '',
      });
      const extraIdx = extraProblems.length;
      problem.tag = `추가 문제 ${extraIdx + 1}`;
      setExtraProblems(prev => [...prev, problem]);
      setSelected(prev => new Set(prev).add(`extra_${extraIdx}`));
    } catch (e) {
      setGenError(prev => ({ ...prev, [skippedIdx]: '생성 실패. 다시 시도하세요.' }));
    } finally {
      setGenerating(prev => { const next = new Set(prev); next.delete(skippedIdx); return next; });
    }
  }

  function handleStart() {
    const src      = allProblems.filter((_, i) => selected.has(`source_${i}`));
    const ext      = extraProblems.filter((_, i) => selected.has(`extra_${i}`));
    const creative = creativeProblems.filter((_, i) => selected.has(`creative_${i}`));
    const filtered = [...src, ...ext, ...creative];
    if (filtered.length === 0) return;
    // 아직 선택지 생성 중인 문제가 있으면 경고
    const pendingCount = filtered.filter(p => p.format === '객관식' && !p.choices?.length).length;
    if (pendingCount > 0) {
      alert(`선택지 생성 중인 문제 ${pendingCount}개가 있어요. 잠깐 기다려 주세요.`);
      return;
    }
    onStart(filtered);
  }

  const totalSelected = selected.size;

  return (
    <div className="review-page">
      {/* 네비 */}
      <nav className="mode-switcher">
        <button className="btn-back" onClick={onBack}>← Home</button>
        <span className="chapter-label">{chapter?.title ?? '문제 선택'}</span>
      </nav>

      {/* 헤더 */}
      <div className="review-header">
        <div className="review-title-row">
          <h2 className="review-title">문제 미리보기</h2>
          <span className="review-count-badge">{totalSelected} / {totalProblems}</span>
        </div>
        <p className="review-sub">풀고 싶은 문제만 선택한 후 시작하세요.</p>
      </div>

      {/* 전체선택 / 해제 + 문제 추가 */}
      <div className="review-controls">
        <button className="btn-select-all" onClick={toggleAll}>
          {allSelected ? '전체 해제' : '전체 선택'}
        </button>
        <button className="btn-add-problem" onClick={() => setShowAddModal(true)}>
          + 창작문제 추가
        </button>
      </div>

      {/* 문제 없음 */}
      {allProblems.length === 0 && extraProblems.length === 0 && (
        <div className="review-empty">
          <p>PDF에서 추출된 문제가 없습니다.</p>
        </div>
      )}

      {/* 문제 목록 — 유형별 섹션 */}
      {[
        { label: '자료 기반', items: allProblems,   prefix: 'source', extra: false },
        { label: '재생성됨',  items: extraProblems, prefix: 'extra',  extra: true  },
      ].map(({ label, items, prefix, extra }) =>
        items.length === 0 ? null : (
          <div key={prefix} className="review-type-section">
            <div className="review-type-label">{label} <span className="review-type-count">{items.length}</span></div>
            <div className="review-list">
              {items.map((p, i) => {
                const key = `${prefix}_${i}`;
                const isCompleting = !extra && completing.has(i);
                const hasErr = !extra && completeErr[i];
                return (
                  <div
                    key={key}
                    className={`review-item ${extra ? 'review-item-extra' : ''} ${selected.has(key) ? 'selected' : ''} ${isCompleting ? 'review-item-loading' : ''}`}
                    onClick={() => !isCompleting && toggle(key)}
                  >
                    <div className="review-item-checkbox">
                      <div className={`review-checkbox ${selected.has(key) ? 'checked' : ''}`}>
                        {selected.has(key) && !isCompleting && <span className="review-checkmark">✓</span>}
                        {isCompleting && <span className="review-checkmark">⋯</span>}
                      </div>
                    </div>
                    <div className="review-item-body">
                      <div className="review-item-meta">
                        <span className="problem-tag">{p.tag}</span>
                        <span className={`problem-type ${extra ? 'skipped-recovered' : ''}`}>
                          {p.format ?? label}
                          {isCompleting && <span className="completing-badge"> 선택지 생성 중...</span>}
                          {hasErr && <span className="completing-badge err"> ⚠ 생성 실패</span>}
                        </span>
                        {p.source && <span className="problem-source">{p.source}</span>}
                      </div>
                      <ProblemPreview latex={p.latex} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* 창작문제 섹션 */}
      {creativeProblems.length > 0 && (
        <div className="review-type-section">
          <div className="review-type-label">
            창작문제 <span className="review-type-count">{creativeProblems.length}</span>
          </div>
          <div className="review-list">
            {creativeProblems.map((p, i) => {
              const key = `creative_${i}`;
              return (
                <div
                  key={key}
                  className={`review-item review-item-creative ${selected.has(key) ? 'selected' : ''}`}
                  onClick={() => toggle(key)}
                >
                  <div className="review-item-checkbox">
                    <div className={`review-checkbox ${selected.has(key) ? 'checked' : ''}`}>
                      {selected.has(key) && <span className="review-checkmark">✓</span>}
                    </div>
                  </div>
                  <div className="review-item-body">
                    <div className="review-item-meta">
                      <span className="problem-tag">{p.tag}</span>
                      <span className="problem-type creative-badge">창작문제</span>
                      <span className="problem-source">{p.format}</span>
                    </div>
                    <ProblemPreview latex={p.latex} />
                  </div>
                  {/* 삭제 버튼 — 창작문제만 */}
                  <button
                    className="review-item-delete"
                    onClick={e => { e.stopPropagation(); deleteCreativeProblem(i); }}
                    title="삭제"
                  >✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 스킵된 항목 섹션 — 항상 표시 */}
      <div className="skipped-section">
        <div className="skipped-section-header">
          <span className="skipped-section-title">AI가 스킵한 항목</span>
          <span className="skipped-section-sub">
            {skippedRaw.length > 0
              ? '포함하기를 누르면 AI가 문제로 변환합니다'
              : '스킵된 항목 없음'}
          </span>
        </div>
        {skippedRaw.length === 0 ? (
          <p className="skipped-empty">모든 항목이 문제로 추출됐거나, 아직 PDF를 새로 업로드하지 않았습니다.</p>
        ) : (
          <div className="skipped-list">
            {skippedRaw.map((item, idx) => {
              const isGenerating = generating.has(idx);
              // Set 조회로 O(1) 처리 — extraProblems.some() 대신 사용
              const isAlreadyAdded = extraSourceSet.has(item.source);
              const err = genError[idx];
              return (
                <div key={idx} className="skipped-item">
                  <div className="skipped-item-meta">
                    <span className="problem-source">{item.source}</span>
                    <span className="skipped-reason">증명 문제로 스킵됨</span>
                  </div>
                  <p className="skipped-item-text">{item.original_text}</p>
                  {err && <p className="skipped-error">{err}</p>}
                  <button
                    className="btn-include"
                    disabled={isGenerating || isAlreadyAdded}
                    onClick={() => handleInclude(item, idx)}
                  >
                    {isGenerating ? '생성 중...' : isAlreadyAdded ? '추가됨 ✓' : '포함하기'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 창작문제 추가 모달 */}
      {showAddModal && (
        <AddProblemModal
          allChapters={allChapters}
          defaultChapterId={chapterId}
          onGenerated={handleCreativeGenerated}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 하단 시작 버튼 */}
      <div className="review-footer">
        <span className="review-footer-count">
          {totalSelected === 0 ? '문제를 하나 이상 선택하세요' : `${totalSelected}문제 선택됨`}
        </span>
        <button
          className="btn-review-start"
          disabled={totalSelected === 0}
          onClick={handleStart}
        >
          시작하기 →
        </button>
      </div>
    </div>
  );
}
