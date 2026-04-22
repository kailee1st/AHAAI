import { useState, useRef, useEffect } from 'react';
import BlankModal from '../components/BlankModal';
import YouTubeModal from '../components/YouTubeModal';

export default function HomePage({
  uploading, uploadError, uploadProgress, uploadStage, onUpload, onUploadText, onUploadYouTube,
  chapters, folders,
  onChaptersChange, onFoldersChange,
  onStudy, onProblem,
}) {
  const [showBlankModal,   setShowBlankModal]   = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [currentFolderId,  setCurrentFolderId]  = useState(null);
  const [newFolderInput,   setNewFolderInput]   = useState(false);
  const [newFolderName,    setNewFolderName]    = useState('');
  const [draggingId,       setDraggingId]       = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [dragOverRoot,     setDragOverRoot]     = useState(false);
  const [menuOpenId,       setMenuOpenId]       = useState(null); // 열린 ⋯ 메뉴
  const [renamingId,       setRenamingId]       = useState(null); // 이름 편집 중인 id
  const [renameVal,        setRenameVal]        = useState('');
  const dragCounters = useRef({});
  const fileRef = useRef(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    function close() { setMenuOpenId(null); }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ─── 파일 업로드 ───
  function onFileInput(e) { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }
  function onDropUpload(e) { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }

  // ─── 폴더/챕터 관리 ───
  function createFolder(name) {
    onFoldersChange([...folders, { id: `folder_${Date.now()}`, name }]);
    setNewFolderInput(false); setNewFolderName('');
  }
  function deleteFolder(fid) {
    onChaptersChange(chapters.map(c => c.folderId === fid ? { ...c, folderId: null } : c));
    onFoldersChange(folders.filter(f => f.id !== fid));
    if (currentFolderId === fid) setCurrentFolderId(null);
  }
  function deleteChapter(id) {
    onChaptersChange(chapters.filter(c => c.id !== id));
    localStorage.removeItem(`aha_progress_${id}`);
  }
  function renameChapter(id, name) {
    if (name.trim()) onChaptersChange(chapters.map(c => c.id === id ? { ...c, title: name.trim() } : c));
    setRenamingId(null); setRenameVal('');
  }
  // onMove: '__rename__' = 이름변경, '__root__' = 루트로, folderId = 폴더로 이동
  function handleChapterAction(id, action, value) {
    if (action === '__rename__') {
      if (value?.trim()) onChaptersChange(chapters.map(c => c.id === id ? { ...c, title: value.trim() } : c));
    } else if (action === '__root__') {
      onChaptersChange(chapters.map(c => c.id === id ? { ...c, folderId: null } : c));
    } else {
      onChaptersChange(chapters.map(c => c.id === id ? { ...c, folderId: action } : c));
    }
    setMenuOpenId(null);
  }

  // ─── 드래그 앤 드롭 ───
  function onFileDragStart(e, id) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
  function onFileDragEnd() {
    setDraggingId(null); setDragOverFolderId(null);
    setDragOverRoot(false); dragCounters.current = {};
  }
  function onFolderDragEnter(e, fid) {
    e.preventDefault();
    dragCounters.current[fid] = (dragCounters.current[fid] || 0) + 1;
    setDragOverFolderId(fid);
  }
  function onFolderDragLeave(e, fid) {
    dragCounters.current[fid] = Math.max(0, (dragCounters.current[fid] || 1) - 1);
    if (dragCounters.current[fid] === 0) setDragOverFolderId(p => p === fid ? null : p);
  }
  function onFolderDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function onFolderDrop(e, fid) {
    e.preventDefault();
    const id = draggingId || e.dataTransfer.getData('text/plain');
    if (id) onChaptersChange(chapters.map(c => c.id === id ? { ...c, folderId: fid } : c));
    dragCounters.current[fid] = 0;
    setDraggingId(null); setDragOverFolderId(null);
  }
  function onRootDrop(e) {
    e.preventDefault(); setDragOverRoot(false);
    const id = draggingId || e.dataTransfer.getData('text/plain');
    if (id) onChaptersChange(chapters.map(c => c.id === id ? { ...c, folderId: null } : c));
    setDraggingId(null);
  }

  // ─── 현재 뷰 계산 ───
  const currentFolder  = folders.find(f => f.id === currentFolderId) ?? null;
  const visibleChapters = currentFolderId
    ? chapters.filter(c => c.folderId === currentFolderId)
    : chapters.filter(c => !c.folderId);

  return (
    <>
    <div className="home-content">
      {/* ── 상단 문구 ── */}
      <div className="home-tagline">
        <h1 className="home-title">✦ Aha AI</h1>
        <p className="home-sub">자료를 올리면 AI가 문제와 요약을 만들어드립니다</p>
      </div>

      {/* ── 업로드 (상단) ── */}
      <div className="upload-section">
        {uploading ? (
          <div className="uploading-progress">
            <div className="uploading-progress-header">
              <span className="uploading-stage">{uploadStage}</span>
              <span className="uploading-pct">{uploadProgress}%</span>
            </div>
            <div className="uploading-bar-track">
              <div className="uploading-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : (
          <>
            <button
              className="upload-pdf-bar"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={onDropUpload}
            >
              <span className="upload-pdf-icon">📄</span>
              <span className="upload-pdf-text">PDF / 문서 업로드</span>
              <span className="upload-pdf-hint">클릭하거나 드래그</span>
            </button>
            <div className="upload-other-tiles">
              <button className="upload-other-tile" onClick={() => setShowBlankModal(true)} disabled={uploading}><span>📝</span><span>Blank</span></button>
              <button className="upload-other-tile soon" disabled><span>🎧</span><span>Audio</span><span className="tile-soon-badge">준비 중</span></button>
              <button className="upload-other-tile" onClick={() => setShowYouTubeModal(true)} disabled={uploading}><span>▶️</span><span>YouTube</span></button>
            </div>
          </>
        )}
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={onFileInput} disabled={uploading} />
        {uploadError && <div className="upload-error-box" style={{ marginTop: 10 }}><span>⚠️</span><span>{uploadError}</span></div>}
      </div>

      {/* ── 파일 목록 ── */}
      <div
        className="files-section"
        onDragOver={e => { if (!dragOverFolderId) { e.preventDefault(); setDragOverRoot(true); } }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={e => { if (!dragOverFolderId) onRootDrop(e); }}
      >
        {/* 헤더 */}
        <div className="files-section-header">
          {currentFolderId ? (
            <div className="breadcrumb">
              <button className="breadcrumb-back" onClick={() => setCurrentFolderId(null)}>내 파일</button>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">📁 {currentFolder?.name}</span>
            </div>
          ) : (
            <span className="section-label">내 파일</span>
          )}

          {!currentFolderId && (
            newFolderInput ? (
              <input
                autoFocus className="folder-name-input"
                placeholder="폴더 이름..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onBlur={() => { if (newFolderName.trim()) createFolder(newFolderName.trim()); else setNewFolderInput(false); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newFolderName.trim()) createFolder(newFolderName.trim());
                  if (e.key === 'Escape') { setNewFolderInput(false); setNewFolderName(''); }
                }}
              />
            ) : (
              <button className="btn-new-folder" onClick={() => setNewFolderInput(true)}>+ 새 폴더</button>
            )
          )}
        </div>

        {/* 그리드 */}
        <div className={`files-grid ${dragOverRoot && !dragOverFolderId ? 'root-drag-over' : ''}`}>
          {/* 루트에서만: 폴더 카드 */}
          {!currentFolderId && folders.map(folder => {
            const count = chapters.filter(c => c.folderId === folder.id).length;
            return (
              <FolderCard
                key={folder.id}
                folder={folder}
                count={count}
                isDragOver={dragOverFolderId === folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                onDelete={() => deleteFolder(folder.id)}
                onDragEnter={e => onFolderDragEnter(e, folder.id)}
                onDragLeave={e => onFolderDragLeave(e, folder.id)}
                onDragOver={onFolderDragOver}
                onDrop={e => onFolderDrop(e, folder.id)}
              />
            );
          })}

          {/* 챕터 파일 카드 */}
          {visibleChapters.map(ch => (
            (
              <FileCard
                key={ch.id} icon="📄"
                title={ch.title} sub={`${ch.subject} · ${ch.problems?.length ?? 0}문제`}
                badge={ch.isDemo ? '내장' : undefined}
                draggable
                onDragStart={e => onFileDragStart(e, ch.id)}
                onDragEnd={onFileDragEnd}
                isDragging={draggingId === ch.id}
                onStudy={() => onStudy(ch.id)}
                onProblem={() => onProblem(ch.id)}
                folders={folders}
                menuOpen={menuOpenId === ch.id}
                onMenuToggle={e => { e.stopPropagation(); setMenuOpenId(id => id === ch.id ? null : ch.id); }}
                onMove={(action, value) => handleChapterAction(ch.id, action, value)}
                onDelete={ch.isDemo ? null : () => { deleteChapter(ch.id); setMenuOpenId(null); }}
              />
            )
          ))}

          {/* 폴더 내 빈 상태 */}
          {currentFolderId && visibleChapters.length === 0 && (
            <div className="folder-empty-state">
              <span>📂</span>
              <p>비어있습니다<br/>파일을 드래그해서 이동하거나 PDF를 업로드하세요</p>
            </div>
          )}
        </div>
      </div>

    </div>

    {showBlankModal && (
      <BlankModal
        onClose={() => setShowBlankModal(false)}
        onSubmit={({ title, text }) => {
          setShowBlankModal(false);
          onUploadText({ title, text });
        }}
      />
    )}
    {showYouTubeModal && (
      <YouTubeModal
        onClose={() => setShowYouTubeModal(false)}
        onSubmit={({ url }) => {
          setShowYouTubeModal(false);
          onUploadYouTube({ url });
        }}
      />
    )}
    </>
  );
}

// ─── 폴더 카드 (파일 카드와 동일한 크기) ───
function FolderCard({ folder, count, isDragOver, onClick, onDelete, onDragEnter, onDragLeave, onDragOver, onDrop }) {
  return (
    <div
      className={`file-card folder-card ${isDragOver ? 'drag-over-card' : ''}`}
      onClick={onClick}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="file-card-default">
        <span className="fc-icon">{isDragOver ? '📂' : '📁'}</span>
        <div className="fc-info">
          <span className="fc-title" title={folder.name}>{folder.name}</span>
          <span className="fc-sub">파일 {count}개</span>
        </div>
        <button className="fc-delete" onClick={e => { e.stopPropagation(); onDelete(); }}>✕</button>
      </div>
      {/* 폴더는 hover시 열기 오버레이 */}
      <div className="folder-card-hover">
        <span className="folder-open-icon">📂</span>
        <span className="folder-open-label">열기</span>
      </div>
    </div>
  );
}

// ─── 파일 카드 ───
function FileCard({ icon, title, sub, badge, draggable, onDragStart, onDragEnd, isDragging,
                    onStudy, onProblem, onDelete, onMove, folders, menuOpen, onMenuToggle }) {
  const [renameVal, setRenameVal] = useState(title);
  const [showFolders, setShowFolders] = useState(false);
  const renameRef = useRef(null);

  useEffect(() => {
    if (menuOpen) {
      setRenameVal(title);
      setShowFolders(false);
      // 약간 지연 후 포커스 (드롭다운 애니메이션 완료 후)
      setTimeout(() => renameRef.current?.focus(), 80);
    }
  }, [menuOpen]);

  // 래퍼 div가 드래그 이벤트를 처리, 카드는 overflow:hidden 유지
  return (
    <div
      className="file-card-wrapper"
      draggable={!!draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* 실제 카드 (overflow:hidden으로 깔끔하게) */}
      <div className={`file-card ${isDragging ? 'is-dragging' : ''}`}>
        <div className="file-card-default">
          <span className="fc-icon">{icon}</span>
          <div className="fc-info">
            <span className="fc-title" title={title}>{title}</span>
            <span className="fc-sub">{sub}</span>
          </div>
          {badge && <span className="fc-badge">{badge}</span>}
        </div>
        <div className="file-card-hover">
          <div className="file-card-half study" onClick={onStudy}>
            <span className="half-icon">📖</span>
            <span className="half-label">공부</span>
          </div>
          <div className="file-card-divider" />
          <div className="file-card-half problem" onClick={onProblem}>
            <span className="half-icon">✏️</span>
            <span className="half-label">문제</span>
          </div>
        </div>
      </div>

      {/* ··· 버튼 + 드롭다운: 래퍼 기준 absolute → 카드 밖으로 나올 수 있음 */}
      {onMenuToggle && (
        <div className="fc-menu-wrap">
          <button className="fc-menu-btn" onClick={e => { e.stopPropagation(); onMenuToggle(e); }}>···</button>
          {menuOpen && (
            <div className="fc-dropdown" onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
              {/* 이름 변경 인풋 (항상 노출) */}
              <div className="fc-dropdown-section">
                <div className="fc-dropdown-label">이름 변경</div>
                <div className="fc-rename-row">
                  <input
                    ref={renameRef}
                    className="fc-rename-input"
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && renameVal.trim()) onMove('__rename__', renameVal.trim());
                      if (e.key === 'Escape') onMenuToggle(e);
                    }}
                  />
                  <button className="fc-rename-ok"
                    onClick={() => { if (renameVal.trim()) onMove('__rename__', renameVal.trim()); }}>
                    확인
                  </button>
                </div>
              </div>

              {/* 폴더 이동 */}
              {showFolders ? (
                <div className="fc-dropdown-section">
                  <div className="fc-dropdown-label">폴더 선택</div>
                  <button className="fc-folder-item" onClick={() => onMove('__root__')}>🏠 메인화면</button>
                  {folders?.map(f => (
                    <button key={f.id} className="fc-folder-item" onClick={() => onMove(f.id)}>📁 {f.name}</button>
                  ))}
                </div>
              ) : (
                <button className="fc-dropdown-item" onClick={() => setShowFolders(true)}>📁 폴더 이동 ›</button>
              )}

              {onDelete && (
                <>
                  <div className="fc-dropdown-divider" />
                  <button className="fc-dropdown-delete" onClick={onDelete}>🗑 삭제</button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
