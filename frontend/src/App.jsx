import { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppSidebar from './components/AppSidebar';
import LoginModal from './components/LoginModal';
import HomePage from './pages/HomePage';
import StudyPage from './pages/StudyPage';
import PracticePage from './pages/PracticePage';
import ProblemReviewPage from './pages/ProblemReviewPage';
import AccountPage from './pages/AccountPage';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import { DEMO_CHAPTER, BUILTIN_LIMITS_CHAPTER } from './data/demoChapter';
import { processFile, processText, processYouTube } from './api/client';
import { saveChapterToFirestore, deleteChapterFromFirestore, loadChaptersFromFirestore } from './api/firestore';
import { uploadPdfToStorage, deletePdfFromStorage } from './api/storage';
import './App.css';

function getChaptersForUser(uid) {
  try { return JSON.parse(localStorage.getItem(`aha_chapters_${uid}`) || '[]'); } catch { return []; }
}
function getFoldersForUser(uid) {
  try { return JSON.parse(localStorage.getItem(`aha_folders_${uid}`) || '[]'); } catch { return []; }
}

function AppInner() {
  const { user, profile, checkUploadLimit, incrementUploadCount, UPLOAD_LIMIT } = useAuth();

  // 'home' | 'study' | 'problem-review' | 'problem' | 'account'
  const [mode,           setMode]           = useState('home');
  const [chapterId,      setChapterId]      = useState(null);
  const [reviewProblems, setReviewProblems] = useState(null);
  const [collapsed,      setCollapsed]      = useState(false);
  const [chapters,       setChapters]       = useState([]);
  const [folders,        setFolders]        = useState([]);
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage,    setUploadStage]    = useState('');
  const [showLogin,      setShowLogin]      = useState(false);
  const progressTimer = useRef(null);

  // 구버전 localStorage 키 정리 (uid 없는 구버전 키)
  useEffect(() => {
    localStorage.removeItem('aha_chapters');
    localStorage.removeItem('aha_folders');
  }, []);

  // 로그인 상태 변경 시 챕터 전환
  useEffect(() => {
    const BUILTIN_IDS = new Set(['builtin_limits_ch1', 'demo_suneung_calculus']);
    if (user) {
      // Firestore에서 로드, localStorage를 캐시/fallback으로 사용
      async function loadChapters() {
        const localChapters = getChaptersForUser(user.uid).filter(c => !BUILTIN_IDS.has(c.id));
        let merged = localChapters;
        try {
          const fsChapters = await loadChaptersFromFirestore(user.uid);
          if (fsChapters.length > 0) {
            // Firestore가 source of truth, localStorage의 extractedText로 보완
            merged = fsChapters.map(fc => {
              const lc = localChapters.find(l => l.id === fc.id);
              return lc?.extractedText ? { ...fc, extractedText: lc.extractedText } : fc;
            });
            // localStorage도 최신화
            localStorage.setItem(`aha_chapters_${user.uid}`, JSON.stringify(merged));
          }
        } catch (e) {
          console.warn('[Firestore] 로드 실패, localStorage 사용:', e.message);
        }
        setChapters([BUILTIN_LIMITS_CHAPTER, DEMO_CHAPTER, ...merged]);
        setFolders(getFoldersForUser(user.uid));
      }
      loadChapters();
    } else {
      // 비로그인 → 내장 챕터만
      setChapters([BUILTIN_LIMITS_CHAPTER, DEMO_CHAPTER]);
      setFolders([]);
    }
    // 페이지 초기화
    setMode(user ? 'home' : 'about');
    setChapterId(null);
  }, [user?.uid]);

  const BUILTIN_IDS = new Set(['builtin_limits_ch1', 'demo_suneung_calculus']);

  function saveChapters(newList) {
    if (user) {
      localStorage.setItem(`aha_chapters_${user.uid}`, JSON.stringify(newList));
      // 삭제된 챕터 → Firestore + Storage에서도 제거
      const newIds = new Set(newList.map(c => c.id));
      chapters.filter(c => !BUILTIN_IDS.has(c.id) && !newIds.has(c.id)).forEach(c => {
        deleteChapterFromFirestore(user.uid, c.id).catch(e => console.warn('[Firestore] 삭제 실패', e));
        if (c.pdfUrl) deletePdfFromStorage(user.uid, c.id).catch(() => {});
      });
      // 추가/변경된 챕터 → Firestore에 저장 (fire-and-forget)
      newList.filter(c => !BUILTIN_IDS.has(c.id)).forEach(ch => {
        saveChapterToFirestore(user.uid, ch).catch(e => console.warn('[Firestore] 저장 실패', e));
      });
    }
    setChapters(newList);
  }
  function updateChapter(updatedChapter) {
    const newList = chapters.map(c => c.id === updatedChapter.id ? updatedChapter : c);
    if (user && !BUILTIN_IDS.has(updatedChapter.id)) {
      localStorage.setItem(`aha_chapters_${user.uid}`, JSON.stringify(newList));
      saveChapterToFirestore(user.uid, updatedChapter).catch(e => console.warn('[Firestore] 업데이트 실패', e));
    }
    setChapters(newList);
  }
  function saveFolders(list) {
    if (user) localStorage.setItem(`aha_folders_${user.uid}`, JSON.stringify(list));
    setFolders(list);
  }

  function startProgressSim() {
    const stages = [
      { target: 15, label: '파일 업로드 중...', interval: 80 },
      { target: 40, label: 'PDF 텍스트 추출 중...', interval: 180 },
      { target: 75, label: 'AI가 요약 생성 중...', interval: 400 },
      { target: 90, label: 'AI가 문제 생성 중...', interval: 800 },
    ];
    let progress = 0;
    let stageIdx = 0;
    clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      if (stageIdx >= stages.length) return;
      const { target, label, interval } = stages[stageIdx];
      setUploadStage(label);
      progress = Math.min(progress + (500 / interval), target);
      setUploadProgress(Math.round(progress));
      if (progress >= target) stageIdx++;
    }, 500);
  }

  async function handleUploadText({ title, text }) {
    if (!user) { setShowLogin(true); return; }
    const { allowed } = await checkUploadLimit();
    if (!allowed) {
      setUploadError(`이번 달 업로드 횟수(${UPLOAD_LIMIT}회)를 모두 사용했습니다.`);
      return;
    }
    setUploading(true); setUploadError('');
    setUploadProgress(0); setUploadStage('내용 분석 중...');
    startProgressSim();
    try {
      const result = await processText({ title, text });
      clearInterval(progressTimer.current);
      setUploadProgress(100); setUploadStage('완료!');
      await incrementUploadCount();
      const ch = {
        id: `chapter_${Date.now()}`, folderId: null,
        title: result.title || title, subject: result.subject,
        source: 'blank', summary: result.summary,
        extractedText: text,
        problems: result.problems,
        skipped: result.skipped ?? [],
        topics: result.topics ?? [],
        creativeProblems: [],
        createdAt: new Date().toISOString(),
      };
      saveChapters([...getChaptersForUser(user.uid), ch]);
    } catch (err) {
      clearInterval(progressTimer.current);
      setUploadProgress(0); setUploadStage('');
      setUploadError(err.response?.data?.detail || err.message || '생성 실패');
    } finally { setUploading(false); }
  }

  async function handleUploadYouTube({ url }) {
    if (!user) { setShowLogin(true); return; }
    const { allowed } = await checkUploadLimit();
    if (!allowed) {
      setUploadError(`이번 달 업로드 횟수(${UPLOAD_LIMIT}회)를 모두 사용했습니다.`);
      return;
    }
    setUploading(true); setUploadError('');
    setUploadProgress(0); setUploadStage('자막 추출 중...');
    startProgressSim();
    try {
      const result = await processYouTube({ url });
      clearInterval(progressTimer.current);
      setUploadProgress(100); setUploadStage('완료!');
      await incrementUploadCount();
      const ch = {
        id: `chapter_${Date.now()}`, folderId: null,
        title: result.title, subject: result.subject,
        source: 'youtube', summary: result.summary,
        extractedText: result.extractedText ?? '',
        youtubeUrl: result.youtubeUrl ?? url,
        problems: result.problems,
        skipped: result.skipped ?? [],
        topics: result.topics ?? [],
        creativeProblems: [],
        createdAt: new Date().toISOString(),
      };
      saveChapters([...getChaptersForUser(user.uid), ch]);
    } catch (err) {
      clearInterval(progressTimer.current);
      setUploadProgress(0); setUploadStage('');
      setUploadError(err.response?.data?.detail || err.message || '생성 실패');
    } finally { setUploading(false); }
  }

  async function handleUpload(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) { setUploadError('PDF 파일만 지원합니다'); return; }

    // 비로그인 차단
    if (!user) { setShowLogin(true); return; }

    // Free 플랜 업로드 한도 체크
    const { allowed, remaining } = await checkUploadLimit();
    if (!allowed) {
      setUploadError(`이번 달 업로드 횟수(${UPLOAD_LIMIT}회)를 모두 사용했습니다. Premium으로 업그레이드하면 무제한 업로드가 가능합니다.`);
      return;
    }

    setUploading(true); setUploadError('');
    setUploadProgress(0); setUploadStage('파일 업로드 중...');
    startProgressSim();
    try {
      const result = await processFile(file);
      clearInterval(progressTimer.current);
      setUploadProgress(100); setUploadStage('완료!');
      await incrementUploadCount();
      const chapterId = `chapter_${Date.now()}`;
      // PDF를 Firebase Storage에도 저장 (미리보기용)
      let pdfUrl = null;
      try {
        pdfUrl = await uploadPdfToStorage(user.uid, chapterId, file);
      } catch (e) { console.warn('[Storage] PDF 업로드 실패:', e.message); }
      const ch = {
        id: chapterId, folderId: null,
        title: result.title, subject: result.subject,
        source: file.name, summary: result.summary,
        extractedText: result.extractedText ?? '',
        pdfUrl,
        problems: result.problems,
        skipped: result.skipped ?? [],
        topics: result.topics ?? [],
        creativeProblems: [],
        createdAt: new Date().toISOString(),
      };
      saveChapters([...getChaptersForUser(user.uid), ch]);
    } catch (err) {
      clearInterval(progressTimer.current);
      setUploadProgress(0); setUploadStage('');
      setUploadError(err.response?.data?.detail || err.message || '업로드 실패');
    } finally { setUploading(false); }
  }

  function goStudy(id)   { setChapterId(id ?? null); setMode('study'); }
  function goProblem(id) {
    setChapterId(id ?? null);
    if (id !== null && id !== undefined) {
      const saved = chapters.find(c => c.id === id);
      if (saved?.selectedProblems?.length > 0) {
        setReviewProblems(saved.selectedProblems);
        setMode('problem');
      } else {
        setReviewProblems(null);
        setMode('problem-review');
      }
    } else {
      setMode('problem');
    }
  }
  function goStartPractice(problems) {
    const id = chapterId;
    if (id) {
      const updated = chapters.map(c =>
        c.id === id ? { ...c, selectedProblems: problems } : c
      );
      saveChapters(updated);
    }
    setReviewProblems(problems);
    setMode('problem');
  }
  function goResetProblemSelection(id) {
    // selectedProblems만 초기화 — creativeProblems는 유지
    const updated = chapters.map(c =>
      c.id === id ? { ...c, selectedProblems: null } : c
    );
    saveChapters(updated);
    setChapterId(id);
    setReviewProblems(null);
    setMode('problem-review');
  }
  function goHome()    { setMode('home'); }
  function goAbout()   { setMode('about'); }
  function goAccount() { setMode('account'); }

  const currentChapter = chapterId ? chapters.find(c => c.id === chapterId) ?? null : null;

  return (
    <div className="app-shell">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(v => !v)}
        onNavigateHome={goHome}
        onAboutClick={goAbout}
        onLoginClick={() => setShowLogin(true)}
        onAccountClick={goAccount}
      />
      <div className="app-content">
        {/* About Us */}
        {mode === 'about' && (
          <AboutPage onLoginClick={() => setShowLogin(true)} />
        )}
        {/* 비로그인 → 랜딩 페이지 */}
        {!user && mode === 'home' && (
          <LandingPage onLoginClick={() => setShowLogin(true)} />
        )}
        {/* 로그인 → 대시보드 */}
        {user && mode === 'home' && (
          <HomePage
            uploading={uploading}
            uploadError={uploadError}
            uploadProgress={uploadProgress}
            uploadStage={uploadStage}
            onUpload={handleUpload}
            onUploadText={handleUploadText}
            onUploadYouTube={handleUploadYouTube}
            chapters={chapters}
            folders={folders}
            onChaptersChange={saveChapters}
            onFoldersChange={saveFolders}
            onStudy={goStudy}
            onProblem={goProblem}
          />
        )}
        {mode === 'study' && (
          <StudyPage
            chapter={currentChapter}
            chapterId={chapterId}
            onBack={goHome}
            onSwitchToProblem={() => goProblem(chapterId)}
          />
        )}
        {mode === 'problem-review' && (
          <ProblemReviewPage
            chapterId={chapterId}
            chapter={currentChapter}
            allChapters={chapters.filter(c => !c.isDemo && c.id !== 'builtin_limits_ch1')}
            onChapterUpdate={updateChapter}
            onBack={goHome}
            onStart={goStartPractice}
          />
        )}
        {mode === 'problem' && (
          <PracticePage
            chapterId={chapterId}
            chapter={currentChapter}
            initialProblems={reviewProblems}
            allChapters={chapters.filter(c => !c.isDemo && c.id !== 'builtin_limits_ch1')}
            onChapterUpdate={updateChapter}
            onBack={goHome}
            onSwitchToStudy={() => goStudy(chapterId)}
            onResetProblems={chapterId ? () => goResetProblemSelection(chapterId) : null}
          />
        )}
        {mode === 'account' && (
          <AccountPage onBack={goHome} />
        )}
      </div>

      {/* 로그인 모달 */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
