import StudyContent from '../components/StudyContent';

export default function StudyPage({ chapter, chapterId, onBack, onSwitchToProblem }) {
  const title = chapter?.title ?? '극한 §1.4–1.6';

  return (
    <div className="study-v2">
      <nav className="study-nav-v2">
        <div className="study-nav-left">
          <button className="btn-back" onClick={onBack}>← Home</button>
          <button className="mode-tab mode-tab-active">📖 공부</button>
          <button className="mode-tab" onClick={onSwitchToProblem}>✏️ 문제</button>
          <span className="chapter-label">{title}</span>
        </div>
      </nav>

      <div className="study-content-page">
        <StudyContent chapter={chapter} chapterId={chapterId} showOriginal={true} />
      </div>
    </div>
  );
}
