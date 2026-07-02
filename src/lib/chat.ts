import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

import { db } from './firebase';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'advisor';
  timestamp: number;
}

function convId(userId: string, advisorId: string): string {
  return `${userId}_${advisorId}`;
}

export function subscribeToMessages(
  advisorId: string,
  userId: string,
  callback: (messages: ChatMessage[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'chats', convId(userId, advisorId), 'messages'),
    orderBy('timestamp', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text as string,
        sender: doc.data().sender as 'user' | 'advisor',
        timestamp: (doc.data().timestamp as any)?.toMillis?.() ?? Date.now(),
      }));
      callback(msgs);
    },
    () => callback([]),
  );
}

export async function sendMessage(
  advisorId: string,
  userId: string,
  text: string,
): Promise<void> {
  const cId = convId(userId, advisorId);
  // Write metadata on the parent doc so the advisor portal can query by advisorId
  await setDoc(doc(db, 'chats', cId), { advisorId, userId, updatedAt: serverTimestamp() }, { merge: true });
  await addDoc(collection(db, 'chats', cId, 'messages'), {
    text,
    sender: 'user',
    timestamp: serverTimestamp(),
  });
}
