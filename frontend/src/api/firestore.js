import { db } from '../firebase';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const BUILTIN_IDS = new Set(['builtin_limits_ch1', 'demo_suneung_calculus']);

// extractedText는 Firestore 1MB 제한 대비 제외
function stripHeavyFields(chapter) {
  // eslint-disable-next-line no-unused-vars
  const { extractedText, ...rest } = chapter;
  return rest;
}

export async function saveChapterToFirestore(uid, chapter) {
  if (BUILTIN_IDS.has(chapter.id)) return;
  const ref = doc(db, 'users', uid, 'chapters', chapter.id);
  await setDoc(ref, stripHeavyFields(chapter));
}

export async function deleteChapterFromFirestore(uid, chapterId) {
  if (BUILTIN_IDS.has(chapterId)) return;
  const ref = doc(db, 'users', uid, 'chapters', chapterId);
  await deleteDoc(ref);
}

export async function loadChaptersFromFirestore(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'chapters'));
  return snap.docs.map(d => d.data());
}
