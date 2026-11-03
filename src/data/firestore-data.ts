/**
 * The one module that reads and writes Firestore. Screens go through it, never through
 * `firebase/firestore` directly. It takes the Firestore instance and a clock, so tests can
 * point it at the emulator and fix the date.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

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
  /** Rejects if today has no Order List. */
  function setTodaysOrderListStatus(status: 'open' | 'locked') {
    return updateDoc(doc(db, 'orderLists', toOrderListId(clock())), {
      status,
      updatedAt: serverTimestamp(),
    });
  }

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

    /**
     * Opens today's Order List and, in the same write, locks every Order List still Open
     * (all of them older, since today has none). Rejects if today already has an Order List.
     */
    async openTodaysOrderList() {
      const today = doc(db, 'orderLists', toOrderListId(clock()));
      const stillOpen = await getDocs(
        query(collection(db, 'orderLists'), where('status', '==', 'open')),
      );
      await runTransaction(db, async (transaction) => {
        if ((await transaction.get(today)).exists()) {
          throw new Error('Today already has an Order List.');
        }
        for (const older of stillOpen.docs) {
          transaction.update(older.ref, { status: 'locked', updatedAt: serverTimestamp() });
        }
        transaction.set(today, { status: 'open', openedAt: serverTimestamp() });
      });
    },

    /** Locks today's Order List, so Members can no longer change their Orders. */
    lockTodaysOrderList() {
      return setTodaysOrderListStatus('locked');
    },

    /** Unlocks today's Order List, so Members can change their Orders again. */
    unlockTodaysOrderList() {
      return setTodaysOrderListStatus('open');
    },

    /** Resolves to whether `pin` is the Admin PIN, read from Firestore and compared on the device. */
    async checkAdminPin(pin: string) {
      const snapshot = await getDoc(doc(db, 'config', 'admin'));
      return snapshot.get('pin') === pin;
    },
  };
}
