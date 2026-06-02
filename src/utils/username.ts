import { db, isFirebaseConfigured } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function isUsernameTaken(username: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    // If offline, we can't really check uniqueness globally, so we'll allow it.
    return false;
  }

  const usernameLower = username.toLowerCase();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('usernameLower', '==', usernameLower));
  
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}
