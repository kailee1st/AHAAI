import { useState } from 'react';
import { generateCreativeProblems } from '../api/client';

const PROBLEM_TYPES = ['4지선다', '참/거짓', '빈칸채우기', '단답형'];

export default function AddProblemModal({ allChapters, defaultChapterId, onGenerated, onClose }) {
  const noChapters = allChapters.length === 0;

  const [selectedChapterId, setSelectedChapterId] = useState(defaultChapterId ?? allChapters[0]?.id ?? '');
  const [selectedTopic,     setSelectedTopic]     = useState('');
  const [customTopic,       setCustomTopic]       = useState('');
  const [useCustom,         setUseCustom]         = useState(false);
  const [count,             setCount]             = useState(3);
  const [problemType,       setProblemType]       = useState('4지선다');
  const [generating,        setGenerating]        = useState(false);
  const [error,             setError]             = useState('');

  const selectedChapter = allChapters.find(c => c.id === selectedChapterId) ?? null;
  const topics = selectedChapter?.topics ?? [];

  function handleChapterChange(id) {
    setSelectedChapterId(id);
    setSelectedTopic('');
    setUseCustom(false);
    setCustomTopic('');
    setError('');
  }

  const effectiveTopic = useCustom ? customTopic.trim() : selectedTopic;
  const canGenerate = !noChapters && selectedChapter && effectiveTopic && !generating;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setError('');
    try {
      const problems = await generateCreativeProblems({
        summary:     selectedChapter.summary ?? '',
        topics:      topics,
        topic:       effectiveTopic,
        count:       count,
        problemType: problemType,
        subject:     selectedChapter.subject ?? '',
      });
      onGenerated(problems, selectedChapter);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || '생성 실패';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card add-problem-modal" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="modal-header">
          <h2>창작문제 추가</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="add-problem-body">
          {/* Step 1: 자료 선택 */}
          <div className="add-problem-step">
            <label className="add-problem-label">1. 자료 선택</label>
            {noChapters ? (
              <p className="add-problem-empty">PDF를 업로드하면 해당 자료를 바탕으로 문제를 만들 수 있어요.</p>
            ) : (
              <div className="add-problem-chapter-list">
                {allChapters.map(ch => (
                  <button
                    key={ch.id}
                    className={`add-problem-chapter-btn ${selectedChapterId === ch.id ? 'selected' : ''}`}
                    onClick={() => handleChapterChange(ch.id)}
                  >
                    <span className="apc-title">{ch.title}</span>
                    <span className="apc-sub">{ch.subject}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: 토픽 선택 */}
          <div className={`add-problem-step ${noChapters || !selectedChapter ? 'add-problem-step-disabled' : ''}`}>
            <label className="add-problem-label">2. 토픽 선택</label>
            {!noChapters && selectedChapter && topics.length === 0 && (
              <p className="add-problem-empty-sub">저장된 토픽이 없습니다. 직접 입력하세요.</p>
            )}
            {!noChapters && selectedChapter && topics.length > 0 && (
              <div className="add-problem-topics">
                {topics.map(t => (
                  <button
                    key={t}
                    className={`add-problem-topic-btn ${!useCustom && selectedTopic === t ? 'selected' : ''}`}
                    onClick={() => { setSelectedTopic(t); setUseCustom(false); setError(''); }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {/* 커스텀 토픽 — 자료 선택 전이면 비활성 */}
            <div className="add-problem-custom-row">
              <button
                className={`add-problem-topic-btn custom-btn ${useCustom ? 'selected' : ''}`}
                disabled={noChapters || !selectedChapter}
                onClick={() => { setUseCustom(true); setSelectedTopic(''); }}
              >
                + 직접 입력
              </button>
              {useCustom && (
                <input
                  autoFocus
                  className="add-problem-custom-input"
                  placeholder="예: 미분의 정의, 극한값 계산..."
                  value={customTopic}
                  onChange={e => { setCustomTopic(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
              )}
            </div>
            {(noChapters || !selectedChapter) && (
              <p className="add-problem-step-hint">자료를 먼저 선택하세요</p>
            )}
          </div>

          {/* Step 3: 개수 + 유형 */}
          <div className={`add-problem-step ${noChapters || !effectiveTopic ? 'add-problem-step-disabled' : ''}`}>
            <label className="add-problem-label">3. 개수 및 형태</label>
            <div className="add-problem-config-row">
              {/* 개수 */}
              <div className="add-problem-count-wrap">
                <span className="add-problem-config-label">개수</span>
                <div className="add-problem-count-btns">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={`count-btn ${count === n ? 'selected' : ''}`}
                      disabled={noChapters || !effectiveTopic}
                      onClick={() => setCount(n)}
                    >{n}</button>
                  ))}
                </div>
              </div>
              {/* 유형 */}
              <div className="add-problem-type-wrap">
                <span className="add-problem-config-label">형태</span>
                <div className="add-problem-type-btns">
                  {PROBLEM_TYPES.map(t => (
                    <button
                      key={t}
                      className={`type-btn ${problemType === t ? 'selected' : ''}`}
                      disabled={noChapters || !effectiveTopic}
                      onClick={() => setProblemType(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>
            </div>
            {(noChapters || !effectiveTopic) && (
              <p className="add-problem-step-hint">토픽을 먼저 선택하세요</p>
            )}
          </div>

          {/* 에러 */}
          {error && <p className="add-problem-error">{error}</p>}
        </div>

        {/* 푸터 */}
        <div className="add-problem-footer">
          <button className="btn-dialog-cancel" onClick={onClose}>취소</button>
          <button
            className="btn-dialog-submit"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            {generating ? '생성 중...' : `문제 ${count}개 생성`}
          </button>
        </div>
      </div>
    </div>
  );
}
