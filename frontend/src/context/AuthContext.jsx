import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null); // Firestore 사용자 프로필
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          // 첫 로그인(Google 등) — 프로필 문서 생성
          // register()로 만든 계정은 이미 setDoc을 완료했으므로 snap.exists() === true
          // 여기는 Google OAuth 최초 로그인 시에만 실행됨
          const newProfile = {
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            language:    'ko',
            subscription: { plan: 'free' },
            createdAt:   serverTimestamp(),
          };
          await setDoc(ref, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function register(email, password, displayName) {
    // 1) 계정 생성
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // 2) displayName 설정 + Firestore 문서 쓰기를 동시에
    //    이렇게 하면 onAuthStateChanged가 발화할 때 snap.exists() === true가 되어
    //    displayName이 빈 값으로 덮어씌워지는 타이밍 버그가 방지됨
    const newProfile = {
      uid: cred.user.uid, email, displayName,
      language: 'ko',
      subscription: { plan: 'free' },
      createdAt: serverTimestamp(),
    };
    await Promise.all([
      updateProfile(cred.user, { displayName }),
      setDoc(doc(db, 'users', cred.user.uid), newProfile),
    ]);
    setUser({ ...cred.user, displayName });
    setProfile(newProfile);
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }

  async function updateLanguage(lang) {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { language: lang }, { merge: true });
    setProfile(prev => ({ ...prev, language: lang }));
  }

  // ── Free 플랜 사용량 추적 ──

  function getMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function getDayKey() {
    const d = new Date();
    return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}_${String(d.getDate()).padStart(2, '0')}`;
  }

  const UPLOAD_LIMIT = 3;  // 월 업로드 횟수
  const HINT_LIMIT   = 10; // 일 힌트 횟수

  async function checkUploadLimit() {
    if (!user) return { allowed: false, remaining: 0 };
    const plan = profile?.subscription?.plan ?? 'free';
    if (plan !== 'free') return { allowed: true, remaining: Infinity };
    const ref  = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const used = snap.data()?.usage?.[`uploads_${getMonthKey()}`] ?? 0;
    return { allowed: used < UPLOAD_LIMIT, remaining: UPLOAD_LIMIT - used };
  }

  async function incrementUploadCount() {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      [`usage.uploads_${getMonthKey()}`]: increment(1),
    });
  }

  async function checkHintLimit() {
    if (!user) return { allowed: true, remaining: Infinity }; // 비로그인은 체크 안 함
    const plan = profile?.subscription?.plan ?? 'free';
    if (plan !== 'free') return { allowed: true, remaining: Infinity };
    const ref  = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const used = snap.data()?.usage?.[`hints_${getDayKey()}`] ?? 0;
    return { allowed: used < HINT_LIMIT, remaining: HINT_LIMIT - used };
  }

  async function incrementHintCount() {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      [`usage.hints_${getDayKey()}`]: increment(1),
    });
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      loginWithGoogle, register, login, logout, updateLanguage,
      checkUploadLimit, incrementUploadCount,
      checkHintLimit, incrementHintCount,
      UPLOAD_LIMIT, HINT_LIMIT,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
