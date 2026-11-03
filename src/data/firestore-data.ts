/**
 * The one module that reads and writes Firestore. Screens go through it, never through
 * `firebase/firestore` directly. It takes the Firestore instance and a clock, so tests can
 * point it at the emulator and fix the date.
 */

import { doc, onSnapshot, type Firestore } from 'firebase/firestore';

/** The status pill's states for today's Order List. */
export type OrderListStatus = 'none' | 'open' | 'locked';

/** Returns the current time; "today" is its local date. */
export type Clock = () => Date;

export type FirestoreData = ReturnType<typeof createFirestoreData>;

/** An Order List's id: the local date as YYYY-MM-DD. */
function toOrderListId(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function createFirestoreData(db: Firestore, clock: Clock) {
  return {
    /** Calls `onStatus` now and on every change to today's Order List. Returns a function that stops watching. */
    watchTodaysOrderListStatus(onStatus: (status: OrderListStatus) => void) {
      return onSnapshot(doc(db, 'orderLists', toOrderListId(clock())), (snapshot) => {
        if (!snapshot.exists()) {
          onStatus('none');
        } else {
          onStatus(snapshot.get('status') === 'locked' ? 'locked' : 'open');
        }
      });
    },
  };
}
