import { useEffect, useRef } from 'react';

let scriptState = 'idle'; // 'idle' | 'loading' | 'ready'
let pendingCallbacks = [];

function loadDesmos() {
  if (scriptState === 'ready') return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (scriptState === 'loading') { pendingCallbacks.push({ resolve, reject }); return; }
    scriptState = 'loading';
    pendingCallbacks.push({ resolve, reject });
    const s = document.createElement('script');
    s.src = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
    s.onload = () => {
      scriptState = 'ready';
      pendingCallbacks.forEach(cb => cb.resolve());
      pendingCallbacks = [];
    };
    s.onerror = () => {
      scriptState = 'idle';
      pendingCallbacks.forEach(cb => cb.reject(new Error('Desmos 로드 실패')));
      pendingCallbacks = [];
    };
    document.head.appendChild(s);
  });
}

export default function DesmosPanel({ onClose }) {
  const containerRef = useRef(null);
  const calcRef = useRef(null);

  useEffect(() => {
    loadDesmos().then(() => {
      if (!containerRef.current || calcRef.current) return;
      calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
        expressions: true,
        keypad: false,
        settingsMenu: false,
        zoomButtons: true,
      });
    }).catch(err => console.error(err));

    return () => {
      if (calcRef.current) { calcRef.current.destroy(); calcRef.current = null; }
    };
  }, []);

  return (
    <div className="desmos-panel">
      <div className="desmos-panel-header">
        <span>📈 그래프</span>
        <button className="panel-close-btn" onClick={onClose}>✕</button>
      </div>
      <div ref={containerRef} className="desmos-container" />
    </div>
  );
}
