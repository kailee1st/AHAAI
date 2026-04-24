import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';
import { BUILTIN_PROBLEMS, RESERVE_PROBLEMS, isCorrect } from '../data/builtinProblems';
import { getHint, analyzeWrongAnswer, gradeAnswer, solveProblem, generateSingleProblem } from '../api/client';
import AddProblemModal from '../components/AddProblemModal';
import StudyContent from '../components/StudyContent';
import DesmosPanel from '../components/DesmosPanel';

const KATEX_OPTIONS = {
  delimiters: [
    { left: '$$',   right: '$$',   display: true  },
    { left: '\\[',  right: '\\]',  display: true  },
    { left: '$',    right: '$',    display: false },
    { left: '\\(',  right: '\\)',  display: false },
  ],
  throwOnError: false,
};

// ─── 객관식 선택지 ───
function McqChoice({ letter, text, selected, correct, wrong, disabled, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = text;
    renderMathInElement(ref.current, KATEX_OPTIONS);
  }, [text]);
  let cls = 'mcq-choice';
  if (selected && !correct && !wrong) cls += ' mcq-selected';
  if (correct) cls += ' mcq-correct';
  if (wrong)   cls += ' mcq-wrong';
  return (
    <button className={cls} onClick={onClick} disabled={disabled}>
      <span className="mcq-letter">{letter}</span>
      <span ref={ref} className="mcq-text" />
    </button>
  );
}

// ─── 문제 텍스트 ───
function ProblemFormula({ latex }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const hasDollar  = /\$/.test(latex);
    // $ 없지만 \frac, \lim 등 LaTeX 명령어만 있는 경우 → 레거시 순수수식 → $$로 감싸기
    // $ 없고 LaTeX 명령어도 없는 경우 → 한국어 등 일반 텍스트 → 그냥 표시
    const hasLatexCmd = /\\[a-zA-Z]/.test(latex);
    ref.current.textContent = (!hasDollar && hasLatexCmd) ? `$$${latex}$$` : latex;
    renderMathInElement(ref.current, KATEX_OPTIONS);
  }, [latex]);
  return <div ref={ref} className="problem-formula" />;
}

// ─── 풀이 텍스트 ───
function SolutionDisplay({ text }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = DOMPurify.sanitize(text);
      renderMathInElement(ref.current, KATEX_OPTIONS);
    }
  }, [text]);
  return <div ref={ref} className="solution-text" />;
}

// ─── 힌트 아이템 ───
function HintItem({ turn, isOpen, onToggle }) {
  const ref = useRef(null);
  useEffect(() => {
    if (isOpen && ref.current) {
      ref.current.innerHTML = DOMPurify.sanitize(turn.hintText);
      renderMathInElement(ref.current, KATEX_OPTIONS);
    }
  }, [isOpen, turn.hintText]);
  return (
    <div className={`hint-item ${isOpen ? 'open' : ''}`}>
      <button className="hint-item-toggle" onClick={onToggle}>
        <span className="hint-q">{turn.question}</span>
        <span className="hint-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div ref={ref} className="hint-answer" />}
    </div>
  );
}

// ─── 힌트 모달 ───
function HintModal({ onSubmit, onClose }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  function submit() { onSubmit(text.trim() || '모르겠어'); }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <p className="dialog-prompt">어떤 게 궁금해? 🤔</p>
        <p className="dialog-sub">구체적으로 물어봐도 좋고, 그냥 '모르겠어'라고 써도 돼.</p>
        <textarea
          ref={ref} className="dialog-textarea" rows={3}
          placeholder="모르겠어~ 라고 써도 좋아"
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <div className="dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose}>닫기</button>
          <button className="btn-dialog-submit" onClick={submit}>힌트 받기</button>
        </div>
      </div>
    </div>
  );
}

// ─── 메타인지 모달 ───
// overlay 클릭 / ESC → 건너뛰기(빈 reasoning)로 처리 — 사용자가 갇히지 않도록
function MetacogModal({ onSubmit }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  // ESC 키 → 건너뛰기
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onSubmit(''); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onSubmit]);

  return (
    <div className="modal-overlay" onClick={() => onSubmit('')}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <p className="dialog-prompt">잠깐 — 왜 그렇게 생각했어? ✍️</p>
        <p className="dialog-sub">틀려도 괜찮아. 어떤 방법으로 접근했는지 써줘. (건너뛰기도 괜찮아)</p>
        <textarea
          ref={ref} className="dialog-textarea" rows={4}
          placeholder="어떤 방법으로 풀었어? (짧게라도 좋아)"
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(text.trim()); } }}
        />
        <div className="dialog-actions">
          <button className="btn-dialog-cancel" onClick={() => onSubmit('')}>건너뛰기</button>
          <button className="btn-dialog-submit" onClick={() => onSubmit(text.trim())}>확인하기</button>
        </div>
      </div>
    </div>
  );
}

// ─── 설정 패널 ───
function SettingsPanel({ onClose, onResetProblems, onAddProblem }) {
  return (
    <div className="settings-panel">
      <div className="settings-header">
        <span>⚙️ 문제 설정</span>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="settings-body">
        {onResetProblems && (
          <div className="settings-row">
            <div>
              <p className="settings-placeholder">문제 재선택</p>
              <p className="settings-sub">PDF에서 가져올 문제를 다시 고릅니다.</p>
            </div>
            <button className="btn-settings-action" onClick={onResetProblems}>재선택</button>
          </div>
        )}
        {onAddProblem && (
          <div className="settings-row">
            <div>
              <p className="settings-placeholder">창작문제 추가</p>
              <p className="settings-sub">내 자료를 바탕으로 AI가 새 문제를 만듭니다.</p>
            </div>
            <button className="btn-settings-action" onClick={onAddProblem}>추가</button>
          </div>
        )}
        <p className="settings-placeholder" style={{ marginTop: 14 }}>힌트 설정 (준비 중)</p>
        <p className="settings-sub">힌트 횟수 제한, 타이머, 난이도 필터 등이 추가될 예정입니다.</p>
      </div>
    </div>
  );
}

function makeInitialState(problems) {
  return problems.map(() => ({ hintsLog: [], attempts: 0, solved: false, lastAnswer: null }));
}

export default function PracticePage({ chapterId, chapter: chapterProp, initialProblems, allChapters = [], onChapterUpdate, onBack, onSwitchToStudy, onResetProblems, onLoginRequired }) {
  const { checkHintLimit, incrementHintCount, HINT_LIMIT } = useAuth();
  // chapterProp 우선 사용 — 없으면 localStorage fallback (구버전 호환)
  const chapter = useMemo(() => {
    if (chapterProp) return chapterProp;
    if (!chapterId) return null;
    try {
      const uid = auth.currentUser?.uid;
      const key = uid ? `aha_chapters_${uid}` : 'aha_chapters';
      return JSON.parse(localStorage.getItem(key) || '[]').find(c => c.id === chapterId) ?? null;
    }
    catch { return null; }
  }, [chapterId, chapterProp]);

  // initialProblems: 리뷰 화면에서 선택된 문제 목록 (없으면 챕터 전체 or 빌트인)
  const [problems,    setProblems]    = useState(() => initialProblems ?? chapter?.problems ?? [...BUILTIN_PROBLEMS]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [pState,      setPState]      = useState(() => makeInitialState(problems));
  const [openHints,   setOpenHints]   = useState({});
  const [hintsReversed, setHintsReversed] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [mcqSelected, setMcqSelected] = useState(null);   // 객관식 선택지 (null | 'A'|'B'|'C'|'D')
  const [mcqResult,   setMcqResult]   = useState(null);   // 객관식 결과 ('correct'|'wrong'|null)
  const [essayInput,  setEssayInput]  = useState('');     // 서술형 입력
  const [essayResult, setEssayResult] = useState(null);   // { correct, score, feedback }
  const [justSolved,  setJustSolved]  = useState(false);  // 방금 맞춘 직후 정답 피드백
  const [loading,     setLoading]     = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [reserveIdx,  setReserveIdx]  = useState(0);

  const [hintModal,    setHintModal]    = useState(false);
  const [metacogModal, setMetacogModal] = useState(false);
  const [pendingVal,   setPendingVal]   = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionText, setSolutionText] = useState('');
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [solutionError, setSolutionError] = useState('');
  const [choicesGenerating, setChoicesGenerating] = useState(false);
  const [inputError, setInputError] = useState('');
  const [showStudyDrawer, setShowStudyDrawer] = useState(false);
  const [showDesmos,      setShowDesmos]      = useState(false);

  const inputRef    = useRef(null);
  // 마운트 여부 추적 — 초기 렌더에서 pState를 localStorage에 덮어쓰지 않도록
  const isMounted = useRef(false);
  const problem  = problems[currentIdx];
  const state    = pState[currentIdx];
  const isMcq   = !!(problem?.choices?.length);
  // 서술형만 essay. 객관식은 choices 생성 중이거나 생성 완료 후 MCQ UI 사용.
  const isEssay = problem?.format === '서술형';
  const hasKnownAnswer = problem?.correct !== null && problem?.correct !== undefined;

  // 문제가 바뀌면 MCQ/서술형/수치/풀이 상태 초기화 (solution은 problem.solution에서 복원)
  useEffect(() => {
    setAnswerInput('');          // 수치 입력창 초기화 — 이전 문제 답이 남지 않도록
    setMcqSelected(null);
    setMcqResult(null);
    setEssayInput('');
    setEssayResult(null);
    setShowSolution(false);
    setSolutionText(problem?.solution ?? '');
    setChoicesGenerating(false);
    setJustSolved(false);
  }, [currentIdx]);

  // 객관식인데 choices 없으면 즉시 생성
  // triggeredIdxRef: 이미 생성 요청을 보낸 인덱스 집합 — choices.length가 변할 때 재실행되지 않도록
  const triggeredChoiceIdxRef = useRef(new Set());
  useEffect(() => {
    if (problem?.format !== '객관식') return;
    if (problem?.choices?.length) return;
    // 이미 이 인덱스에 대해 요청을 보낸 경우 중복 실행 방지
    if (triggeredChoiceIdxRef.current.has(currentIdx)) return;
    triggeredChoiceIdxRef.current.add(currentIdx);

    let cancelled = false;
    setChoicesGenerating(true);
    generateSingleProblem({
      originalText: problem.promptText || problem.latex,
      source: problem.source ?? '',
      subject: chapter?.subject ?? '',
    }).then(full => {
      if (cancelled) return;
      setProblems(prev => {
        const next = prev.map((p, i) =>
          i === currentIdx ? { ...p, choices: full.choices, correct: full.correct, solution: full.solution } : p
        );
        // choices를 챕터 localStorage + Firestore에 영구 저장
        try {
          const uid = auth.currentUser?.uid;
          const key = uid ? `aha_chapters_${uid}` : 'aha_chapters';
          const chapters = JSON.parse(localStorage.getItem(key) || '[]');
          const ci = chapters.findIndex(c => c.id === chapterId);
          if (ci !== -1) {
            chapters[ci].problems = next;
            localStorage.setItem(key, JSON.stringify(chapters));
            // Firestore 동기화
            if (onChapterUpdate) onChapterUpdate({ ...chapters[ci] });
          }
        } catch { /* noop */ }
        return next;
      });
    }).catch(err => console.error('choices gen failed', err))
      .finally(() => { if (!cancelled) setChoicesGenerating(false); });
    return () => { cancelled = true; };
  // problem.format과 currentIdx만 의존 — choices.length 변화로 재실행되지 않도록 의도적으로 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, problem?.format]);

  // storageKey는 chapterId가 변하지 않으므로 메모이제이션
  const storageKey = useMemo(
    () => `aha_progress_${chapterId ?? 'builtin_limits_ch1'}`,
    [chapterId]
  );

  // 저장된 진행 상태 복원 — 마운트 시 한 번만 실행
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && saved.length === problems.length) setPState(saved);
    } catch { /* noop */ }
    // 복원 완료 후 mounted 플래그 설정
    isMounted.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pState 변경 시 localStorage 저장 — 초기 마운트에서는 저장하지 않음 (불필요한 쓰기 방지)
  useEffect(() => {
    if (!isMounted.current) return;
    try { localStorage.setItem(storageKey, JSON.stringify(pState)); } catch { /* noop */ }
  }, [pState, storageKey]);

  function updateState(idx, patch) {
    setPState(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  function openHintInLog(log) {
    setOpenHints(prev => {
      const set = new Set(prev[currentIdx] ?? []);
      set.add(log.length - 1);
      return { ...prev, [currentIdx]: set };
    });
  }

  // ─── 객관식 제출 ───
  function handleMcqSubmit() {
    if (!mcqSelected) return;
    const correct = isCorrect(mcqSelected, problem.correct, 0);
    updateState(currentIdx, { attempts: state.attempts + 1, lastAnswer: mcqSelected });
    if (correct) {
      setMcqResult('correct');
      updateState(currentIdx, { solved: true });
      handleShowSolution();
    } else {
      setMcqResult('wrong');
    }
  }

  // ─── 수치 답 제출 ───
  function handleCheckClick() {
    const raw = answerInput.trim();
    if (!raw || loading) return;
    const val = parseFloat(raw);
    if (isNaN(val)) {
      // 숫자가 아닌 입력 — 사용자에게 명확한 안내 표시
      setInputError('숫자만 입력할 수 있어요');
      return;
    }
    setInputError('');
    setPendingVal(val); setMetacogModal(true);
  }

  async function handleEvaluate(reasoning) {
    setMetacogModal(false);
    const val = pendingVal; setPendingVal(null);
    updateState(currentIdx, { attempts: state.attempts + 1, lastAnswer: val });

    if (hasKnownAnswer) {
      // 정답이 알려진 경우 — 직접 비교
      if (isCorrect(val, problem.correct, Math.max(problem.tolerance ?? 0, 0.01))) {
        updateState(currentIdx, { solved: true });
        setAnswerInput('');
        setJustSolved(true);
        handleShowSolution(); return;
      }
      setLoading(true); setLoadingText('AI가 풀이를 분석하는 중...');
      try {
        const hint = await analyzeWrongAnswer({ problem, hintsLog: state.hintsLog, wrongVal: val, reasoning, attempts: state.attempts + 1 });
        const label = reasoning ? `오답 — "${reasoning.slice(0, 28)}"` : `답: ${val} (오답)`;
        const newLog = [...state.hintsLog, { question: label, hintText: hint }];
        updateState(currentIdx, { hintsLog: newLog });
        openHintInLog(newLog);
      } catch (err) { console.error(err); }
      finally { setLoading(false); setLoadingText(''); setAnswerInput(''); inputRef.current?.focus(); }
    } else {
      // 정답 모름 — 풀이 텍스트와 정답이 반드시 같은 소스여야 함
      setLoading(true); setLoadingText('AI가 답을 확인하는 중...');
      try {
        let sol = solutionText;
        let correctVal = problem.correct ?? null;

        if (!sol) {
          // 풀이 자체가 없음 → API 한 번 호출
          const { solution, answer, verified } = await solveProblem({ problem });
          saveSolutionToStorage(currentIdx, solution, answer, verified);
          setSolutionText(solution);
          sol = solution;
          // answer가 null이면 텍스트에서 추출 (saveSolutionToStorage와 동일 로직)
          correctVal = answer ?? extractAnswerFromText(solution);
        } else {
          // 풀이 있음 → 절대 재호출 안 함. 텍스트에서 직접 추출
          correctVal = problem.correct ?? extractAnswerFromText(sol);
        }

        const tol = Math.max(problem.tolerance ?? 0, 0.01);
        if (correctVal !== null && isCorrect(val, correctVal, tol)) {
          updateState(currentIdx, { solved: true });
          setAnswerInput('');
          setJustSolved(true);
          setShowSolution(true);
        } else {
          const hint = await analyzeWrongAnswer({ problem, hintsLog: state.hintsLog, wrongVal: val, reasoning, attempts: state.attempts + 1 });
          const label = reasoning ? `오답 — "${reasoning.slice(0, 28)}"` : `답: ${val} (오답)`;
          const newLog = [...state.hintsLog, { question: label, hintText: hint }];
          updateState(currentIdx, { hintsLog: newLog });
          openHintInLog(newLog);
          setAnswerInput('');
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); setLoadingText(''); inputRef.current?.focus(); }
    }
  }

  async function handleHintSubmit(question) {
    // 힌트 한도 체크 (Free 플랜: 하루 10회)
    const { allowed, remaining } = await checkHintLimit();
    if (!allowed) {
      setHintModal(false);
      setLoadingText(`오늘 힌트를 모두 사용했어요 (하루 ${HINT_LIMIT}회). Premium이면 무제한!`);
      setTimeout(() => setLoadingText(''), 4000);
      return;
    }

    // API 호출 전에 현재 인덱스/상태를 캡처 — 호출 중 문제 이동 시 stale 참조 방지
    const idx = currentIdx;
    const snap = state;
    setHintModal(false);

    // 창작문제 첫 번째 힌트: 저장된 hint 필드 사용 (AI 호출 없음)
    // 이후 힌트 요청은 일반 AI 경로로 폴스루
    if (problem.isCreative && problem.hint && snap.hintsLog.length === 0) {
      const newLog = [...snap.hintsLog, { question, hintText: problem.hint }];
      updateState(idx, { hintsLog: newLog });
      openHintInLog(newLog);
      return;
    }

    setLoading(true); setLoadingText('AI 튜터가 힌트를 생성하는 중...');
    try {
      const hint = await getHint({ problem, hintsLog: snap.hintsLog, question, attempts: snap.attempts });
      await incrementHintCount();
      const newLog = [...snap.hintsLog, { question, hintText: hint }];
      updateState(idx, { hintsLog: newLog });
      openHintInLog(newLog);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setLoadingText(''); inputRef.current?.focus(); }
  }

  // ─── 서술형 제출 ───
  async function handleEssaySubmit() {
    if (!essayInput.trim() || loading) return;
    setLoading(true); setLoadingText('AI가 답안을 채점하는 중...');
    try {
      const result = await gradeAnswer({ problem, studentAnswer: essayInput.trim(), expectedSolution: solutionText });
      setEssayResult(result);
      if (result.correct) {
        updateState(currentIdx, { solved: true, attempts: state.attempts + 1 });
        handleShowSolution();
      } else {
        updateState(currentIdx, { attempts: state.attempts + 1 });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); setLoadingText(''); }
  }

  function extractAnswerFromText(text) {
    if (!text) return null;
    const m = text.match(/ANSWER:[^0-9\-]*(-?[\d,]+(?:\.\d+)?)/i);
    if (m) { const v = parseFloat(m[1].replace(',', '')); if (!isNaN(v)) return v; }
    return null;
  }

  function saveSolutionToStorage(idx, sol, answer = null, verified = undefined) {
    // answer가 null이면 풀이 텍스트에서 직접 추출 시도
    const finalAnswer = answer ?? extractAnswerFromText(sol);
    // problems state + localStorage 챕터 동시 저장
    setProblems(prev => {
      const next = prev.map((p, i) =>
        i === idx ? {
          ...p,
          solution: sol,
          ...(finalAnswer !== null ? { correct: finalAnswer } : {}),
          ...(verified !== undefined ? { verified } : {}),
        } : p
      );
      if (chapterId) {
        try {
          const uid = auth.currentUser?.uid;
          const key = uid ? `aha_chapters_${uid}` : 'aha_chapters';
          const chapters = JSON.parse(localStorage.getItem(key) || '[]');
          const ci = chapters.findIndex(c => c.id === chapterId);
          if (ci !== -1) {
            chapters[ci].problems = next;
            localStorage.setItem(key, JSON.stringify(chapters));
          }
        } catch { /* noop */ }
      }
      return next;
    });
  }

  async function handleShowSolution() {
    if (showSolution) { setShowSolution(false); return; }
    if (solutionText) { setShowSolution(true); return; }
    setSolutionLoading(true);
    setSolutionError('');
    try {
      const { solution, answer, verified } = await solveProblem({ problem });
      saveSolutionToStorage(currentIdx, solution, answer, verified);
      setSolutionText(solution);
      setShowSolution(true);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || '오류 발생';
      setSolutionError(msg.includes('rate') || msg.includes('429') ? '잠시 후 다시 시도해주세요 (API 한도 초과)' : '풀이 생성 실패');
    }
    finally { setSolutionLoading(false); }
  }

  async function handleRegenerateSolution() {
    setSolutionLoading(true);
    setSolutionError('');
    try {
      const { solution, answer, verified } = await solveProblem({ problem });
      saveSolutionToStorage(currentIdx, solution, answer, verified);
      setSolutionText(solution);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || '오류 발생';
      setSolutionError(msg.includes('rate') || msg.includes('429') ? '잠시 후 다시 시도해주세요 (API 한도 초과)' : '재생성 실패');
    }
    finally { setSolutionLoading(false); }
  }

  // 창작문제 추가 (설정 패널에서)
  function handleCreativeAdded(newProblems) {
    const tagged = newProblems.map((p, i) => ({
      ...p,
      tag: `창작 ${problems.filter(x => x.isCreative).length + i + 1}`,
      isCreative: true,
    }));
    setProblems(prev => [...prev, ...tagged]);
    setPState(prev => [...prev, ...makeInitialState(tagged)]);
    // 챕터의 creativeProblems 저장
    if (chapter && onChapterUpdate) {
      const existing = chapter.creativeProblems ?? [];
      onChapterUpdate({ ...chapter, creativeProblems: [...existing, ...tagged] });
    }
    setShowAddModal(false);
    setShowSettings(false);
  }

  // 창작문제 삭제 (문제 풀기 중)
  function handleDeleteCreative(idx) {
    if (!problems[idx]?.isCreative) return;
    setProblems(prev => prev.filter((_, i) => i !== idx));
    setPState(prev => prev.filter((_, i) => i !== idx));
    setCurrentIdx(prev => (idx < prev ? prev - 1 : Math.min(prev, problems.length - 2)));
    // 챕터 creativeProblems 동기화
    if (chapter && onChapterUpdate) {
      const deletedTag = problems[idx].tag;
      const existing = chapter.creativeProblems ?? [];
      onChapterUpdate({ ...chapter, creativeProblems: existing.filter(p => p.tag !== deletedTag) });
    }
  }

  function handleLoadMore() {
    const next = RESERVE_PROBLEMS.slice(reserveIdx, reserveIdx + 3);
    if (!next.length) return;
    setProblems(prev => [...prev, ...next]);
    setPState(prev => [...prev, ...makeInitialState(next)]);
    setReserveIdx(r => r + 3);
    setCurrentIdx(problems.length);
  }

  function toggleHint(hintIdx) {
    setOpenHints(prev => {
      const set = new Set(prev[currentIdx] ?? []);
      if (set.has(hintIdx)) set.delete(hintIdx); else set.add(hintIdx);
      return { ...prev, [currentIdx]: set };
    });
  }

  const chapterTitle = chapter?.title ?? '극한 §1.4–1.6';
  const showMoreButton = state.solved && currentIdx === problems.length - 1 && reserveIdx < RESERVE_PROBLEMS.length;

  // 힌트 목록 (정순 or 역순) — 역순 토글 시에만 재계산
  const hintsLog = state.hintsLog;
  const displayedHints = useMemo(
    () => (hintsReversed ? [...hintsLog].reverse() : hintsLog),
    [hintsLog, hintsReversed]
  );
  // 역순일 때 실제 인덱스 매핑
  function realHintIdx(displayIdx) {
    return hintsReversed ? hintsLog.length - 1 - displayIdx : displayIdx;
  }

  return (
    <div className={`practice-page ${showStudyDrawer ? 'with-study-panel' : ''}`}>
      {/* ── 모드 스위처 ── */}
      <nav className="mode-switcher">
        <button className="btn-back" onClick={onBack}>← Home</button>
        {onSwitchToStudy && (
          <button className="mode-tab" onClick={onSwitchToStudy}>📖 공부</button>
        )}
        <button className="mode-tab mode-tab-active">✏️ 문제</button>
        <span className="chapter-label">{chapterTitle}</span>
        <button className="btn-settings" onClick={() => setShowSettings(v => !v)} title="문제 설정">⚙️</button>
      </nav>

      {/* ── 메인 분할 레이아웃 ── */}
      <div className="practice-layout">
        {/* 문제 영역 */}
        <div className="practice-main">
        {/* 우측 세로 탭 버튼 */}
        <div className="practice-side-tabs">
          {chapter && (
            <button
              className={`side-tab-btn ${showStudyDrawer ? 'side-tab-active' : ''}`}
              onClick={() => setShowStudyDrawer(v => !v)}
              title="공부 패널"
            >📖<span>공부</span></button>
          )}
          <button
            className={`side-tab-btn ${showDesmos ? 'side-tab-active' : ''}`}
            onClick={() => setShowDesmos(v => !v)}
            title="그래프"
          >📈<span>그래프</span></button>
        </div>

      {/* 설정 패널 */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onResetProblems={onResetProblems}
          onAddProblem={() => { setShowSettings(false); setShowAddModal(true); }}
        />
      )}

      {/* ── 진행 바 (점 + 화살표) ── */}
      <div className="problem-nav-bar">
        <button
          className="nav-arrow"
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
        >‹</button>

        <div className="problem-dots">
          {problems.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === currentIdx ? 'active' : ''} ${pState[i]?.solved ? 'solved' : ''}`}
              onClick={() => setCurrentIdx(i)}
              title={`문제 ${i + 1}`}
            />
          ))}
          <span className="progress-label">{currentIdx + 1} / {problems.length}</span>
        </div>

        <button
          className="nav-arrow"
          onClick={() => setCurrentIdx(i => Math.min(problems.length - 1, i + 1))}
          disabled={currentIdx === problems.length - 1}
        >›</button>
      </div>

      {/* ── 문제 카드 ── */}
      <div className="problem-card">
        <div className="problem-meta">
          <span className="problem-tag">{problem.tag}</span>
          {problem.isCreative ? (
            <>
              <span className="problem-type creative-badge">창작문제</span>
              <button
                className="btn-delete-creative"
                onClick={() => handleDeleteCreative(currentIdx)}
                title="이 창작문제 삭제"
              >✕</button>
            </>
          ) : (
            <span className="problem-type">{problem.type}</span>
          )}
          <span className="problem-source">{problem.source}</span>
          {!problem.isCreative && (
            <button
              className={`btn-solution-toggle ${showSolution ? 'active' : ''}`}
              onClick={handleShowSolution}
              disabled={solutionLoading}
            >{solutionLoading ? '...' : showSolution ? '닫기' : '정답 보기'}</button>
          )}
        </div>

        <div className="problem-formula-row">
          <ProblemFormula latex={problem.latex} />
        </div>
        {solutionError && <p className="solution-error">{solutionError}</p>}
        {showSolution && solutionText && (
          <div className="solution-panel">
            <SolutionDisplay text={solutionText} />
            <div className="solution-panel-actions">
              {problem?.verified === true && (
                <span className="badge-verified">✓ AI 교차검증 완료</span>
              )}
              {problem?.verified === false && (
                <span className="badge-unverified">⚠ 두 AI 답이 달라 — 풀이를 직접 확인해보세요</span>
              )}
              <button
                className="btn-regenerate"
                onClick={handleRegenerateSolution}
                disabled={solutionLoading}
              >{solutionLoading ? '...' : '↺ 재생성'}</button>
            </div>
          </div>
        )}

        {/* 힌트 히스토리 — MCQ는 답안 아래에 렌더링, 나머지는 여기 */}
        {hintsLog.length > 0 && !isMcq && (
          <div className="hints-section">
            <div className="hints-header">
              <span className="hints-count">힌트 {hintsLog.length}개</span>
              <button
                className="btn-reverse"
                onClick={() => setHintsReversed(v => !v)}
                title="힌트 순서 뒤집기"
              >
                {hintsReversed ? '↓ 최신순' : '↑ 오래된순'}
              </button>
            </div>
            <div className="hints-history">
              {displayedHints.map((turn, displayIdx) => {
                const realIdx = realHintIdx(displayIdx);
                return (
                  <HintItem
                    key={realIdx}
                    turn={turn}
                    isOpen={openHints[currentIdx]?.has(realIdx) ?? false}
                    onToggle={() => toggleHint(realIdx)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 이전에 맞춘 문제 알림 */}
        {state.solved && (
          <p className="solved-note">✓ 저번에 맞춘 적이 있는 문제예요</p>
        )}

        {/* 정답 / 입력 */}
        {isEssay ? (
          /* ── 서술형 UI ── */
          <div className="answer-area">
            <textarea
              className="essay-input"
              placeholder="풀이를 자유롭게 써봐. 수식은 LaTeX ($...$) 써도 돼."
              value={essayInput}
              onChange={e => setEssayInput(e.target.value)}
              disabled={loading}
              rows={5}
            />
            {essayResult && (
              <div className={`essay-result essay-result-${essayResult.score}`}>
                <span className="essay-score-badge">
                  {essayResult.score === 'correct' ? '✓ 정답' : essayResult.score === 'partial' ? '△ 부분 정답' : '✗ 오답'}
                </span>
                <p className="essay-feedback">{essayResult.feedback}</p>
                {problem.solution && (
                  <details className="solution-detail">
                    <summary>모범 풀이 보기</summary>
                    <SolutionDisplay text={problem.solution} />
                  </details>
                )}
              </div>
            )}
            <div className="answer-row" style={{ marginTop: 8 }}>
              {!essayResult && (
                <button className="btn-submit" onClick={handleEssaySubmit} disabled={loading || !essayInput.trim()}>
                  {loading ? '채점 중...' : '제출'}
                </button>
              )}
              <button className="btn-hint" onClick={() => setHintModal(true)} disabled={loading}>? 힌트</button>
              {essayResult && essayResult.score !== 'correct' && (
                <button className="btn-essay-retry" onClick={() => setEssayResult(null)}>다시 시도</button>
              )}
            </div>
            {loading && <p className="loading-text">{loadingText}</p>}
          </div>
        ) : problem?.format === '객관식' && choicesGenerating ? (
          /* ── 객관식 보기 생성 중 ── */
          <div className="answer-area">
            <p className="loading-text">보기 생성 중...</p>
          </div>
        ) : isMcq ? (
          /* ── 객관식 UI ── */
          <div className="answer-area">
            <div className="mcq-choices">
              {problem.choices.map((choice, ci) => {
                const letter = ['A','B','C','D'][ci];
                const isSelected = mcqSelected === letter;
                const isCorrectChoice = mcqResult && letter === problem.correct;
                const isWrongChoice   = mcqResult === 'wrong' && isSelected;
                return (
                  <McqChoice
                    key={letter}
                    letter={letter}
                    text={choice.replace(/^[A-D]\.\s*/, '')}
                    selected={isSelected}
                    correct={isCorrectChoice}
                    wrong={isWrongChoice}
                    disabled={!!mcqResult}
                    onClick={() => !mcqResult && setMcqSelected(letter)}
                  />
                );
              })}
            </div>
            {mcqResult === 'wrong' && (
              <p className="mcq-wrong-msg">
                오답 — 정답은 <strong>{problem.correct}</strong>이야.
                {problem.solution && ' 풀이를 확인해봐.'}
              </p>
            )}
            {!mcqResult && (
              <div className="answer-row" style={{ marginTop: 10 }}>
                <button
                  className="btn-submit"
                  onClick={handleMcqSubmit}
                  disabled={!mcqSelected}
                >제출</button>
                <button className="btn-hint" onClick={() => setHintModal(true)}>? 힌트</button>
              </div>
            )}
            {/* 오답 후 재시도 버튼 — choices를 다시 선택할 수 있도록 상태 초기화 */}
            {mcqResult === 'wrong' && (
              <div className="answer-row" style={{ marginTop: 10 }}>
                <button
                  className="btn-essay-retry"
                  onClick={() => { setMcqResult(null); setMcqSelected(null); }}
                >다시 풀기</button>
                <button className="btn-hint" onClick={() => setHintModal(true)}>? 힌트</button>
              </div>
            )}
            {mcqResult === 'wrong' && problem.solution && (
              <details className="solution-detail" style={{ marginTop: 8 }}>
                <summary>풀이 보기</summary>
                <SolutionDisplay text={problem.solution} />
              </details>
            )}
            {/* MCQ 힌트 히스토리 — 답안 아래 */}
            {hintsLog.length > 0 && (
              <div className="hints-section" style={{ marginTop: 14 }}>
                <div className="hints-header">
                  <span className="hints-count">힌트 {hintsLog.length}개</span>
                  <button className="btn-reverse" onClick={() => setHintsReversed(v => !v)}>
                    {hintsReversed ? '↓ 최신순' : '↑ 오래된순'}
                  </button>
                </div>
                <div className="hints-history">
                  {displayedHints.map((turn, displayIdx) => {
                    const realIdx = realHintIdx(displayIdx);
                    return (
                      <HintItem key={realIdx} turn={turn}
                        isOpen={openHints[currentIdx]?.has(realIdx) ?? false}
                        onToggle={() => toggleHint(realIdx)} />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (problem?.format === '빈칸채우기' || problem?.format === '단답형') ? (
          /* ── 빈칸채우기 / 단답형 UI ── */
          <div className="answer-area">
            {justSolved && <div className="numeric-correct-banner">✓ 정답이야!</div>}
            <div className="answer-row">
              <input
                ref={inputRef} type="text" className={`answer-input${inputError ? ' answer-input-error' : ''}`}
                placeholder={problem.format === '빈칸채우기' ? '빈칸에 들어갈 답' : '짧게 답해봐'}
                value={answerInput}
                onChange={e => { setAnswerInput(e.target.value); setInputError(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const ans = answerInput.trim();
                    if (!ans || loading) return;
                    const correct = (problem.correct ?? '').toString().trim().toLowerCase();
                    if (ans.toLowerCase() === correct) {
                      updateState(currentIdx, { solved: true, attempts: state.attempts + 1, lastAnswer: ans });
                      setAnswerInput('');
                      setJustSolved(true);
                    } else {
                      setInputError(`오답이야. 정답: ${problem.correct}`);
                      updateState(currentIdx, { attempts: state.attempts + 1, lastAnswer: ans });
                    }
                  }
                }}
                disabled={loading || state.solved}
              />
              <button
                className="btn-submit"
                disabled={loading || state.solved || !answerInput.trim()}
                onClick={() => {
                  const ans = answerInput.trim();
                  if (!ans) return;
                  const correct = (problem.correct ?? '').toString().trim().toLowerCase();
                  if (ans.toLowerCase() === correct) {
                    updateState(currentIdx, { solved: true, attempts: state.attempts + 1, lastAnswer: ans });
                    setAnswerInput('');
                    setJustSolved(true);
                  } else {
                    setInputError(`오답이야. 정답: ${problem.correct}`);
                    updateState(currentIdx, { attempts: state.attempts + 1, lastAnswer: ans });
                  }
                }}
              >제출</button>
            </div>
            {inputError && <p className="input-error-text">{inputError}</p>}
          </div>
        ) : (
          /* ── 수치 입력 UI ── */
          <div className="answer-area">
            {justSolved && (
              <div className="numeric-correct-banner">✓ 정답이야!</div>
            )}
            <div className="answer-row">
              <input
                ref={inputRef} type="number" className={`answer-input${inputError ? ' answer-input-error' : ''}`}
                placeholder="답 입력" value={answerInput}
                onChange={e => { setAnswerInput(e.target.value); setInputError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleCheckClick()}
                disabled={loading}
              />
              <button className="btn-submit" onClick={handleCheckClick} disabled={loading}>제출</button>
              <button className="btn-hint" onClick={() => setHintModal(true)} disabled={loading}>? 힌트</button>
            </div>
            {inputError && <p className="input-error-text">{inputError}</p>}
            {loading && <p className="loading-text">{loadingText}</p>}
          </div>
        )}
      </div>

      {/* ── 다음 / 더 풀기 ── */}
      <div className="nav-area">
        {state.solved && currentIdx < problems.length - 1 && (
          <button className="btn-next" onClick={() => setCurrentIdx(i => i + 1)}>
            다음 문제 →
          </button>
        )}
        {showMoreButton && (
          <button className="btn-more" onClick={handleLoadMore}>더 풀기 (+3문제)</button>
        )}
      </div>

      {/* ── 모달들 ── */}
      {hintModal    && <HintModal onSubmit={handleHintSubmit} onClose={() => setHintModal(false)} />}
      {metacogModal && <MetacogModal onSubmit={handleEvaluate} />}
      {showAddModal && (
        <AddProblemModal
          allChapters={allChapters}
          defaultChapterId={chapterId}
          onGenerated={handleCreativeAdded}
          onClose={() => setShowAddModal(false)}
        />
      )}
        </div>{/* /practice-main */}

        {/* ── 우측 공부 패널 ── */}
        {showStudyDrawer && chapter && (
          <div className="practice-study-panel">
            <div className="study-drawer-header">
              <span>📖 공부 패널</span>
              <button className="panel-close-btn" onClick={() => setShowStudyDrawer(false)}>✕</button>
            </div>
            <div className="study-drawer-body">
              <StudyContent chapter={chapter} chapterId={chapterId} showOriginal={false} />
            </div>
          </div>
        )}

        {/* ── 우측 Desmos 패널 ── */}
        {showDesmos && (
          <DesmosPanel onClose={() => setShowDesmos(false)} />
        )}
      </div>{/* /practice-layout */}
    </div>
  );
}
