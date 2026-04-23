import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../firebase';

const storage = getStorage(app);

export async function uploadPdfToStorage(uid, chapterId, file) {
  const storageRef = ref(storage, `users/${uid}/pdfs/${chapterId}.pdf`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function deletePdfFromStorage(uid, chapterId) {
  try {
    const storageRef = ref(storage, `users/${uid}/pdfs/${chapterId}.pdf`);
    await deleteObject(storageRef);
  } catch { /* 파일 없으면 무시 */ }
}
