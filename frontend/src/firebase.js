import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ⚠️ Firebase 콘솔(console.firebase.google.com)에서 프로젝트 생성 후
// 아래 값들을 채워 넣으세요.
const firebaseConfig = {
  apiKey:            "AIzaSyATkDR2Hte878pbtXY_Z1n4vdzWm7f-dF0",
  authDomain:        "aha-ai-aee2e.firebaseapp.com",
  projectId:         "aha-ai-aee2e",
  storageBucket:     "aha-ai-aee2e.firebasestorage.app",
  messagingSenderId: "174914190890",
  appId:             "1:174914190890:web:65f85e7b3d65c65922cd53",
  measurementId:     "G-MGJSJE50B5",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
