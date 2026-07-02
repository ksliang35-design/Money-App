import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

import { db } from './firebase';

export interface Advisor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  avatar: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  bio?: string;
  available?: boolean;
}

export function subscribeToAdvisors(callback: (advisors: Advisor[]) => void): Unsubscribe {
  const q = query(collection(db, 'advisors'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: Advisor[] = snap.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name as string,
          title: (doc.data().title ?? '') as string,
          specialty: (doc.data().specialty ?? '') as string,
          avatar: (doc.data().avatar ?? '🧑‍💼') as string,
          whatsapp: doc.data().whatsapp as string | undefined,
          phone: doc.data().phone as string | undefined,
          email: doc.data().email as string | undefined,
          bio: doc.data().bio as string | undefined,
          available: (doc.data().available ?? true) as boolean,
        }))
        .filter((a) => a.available);
      callback(list);
    },
    () => callback([]),
  );
}
