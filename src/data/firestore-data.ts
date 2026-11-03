/**
 * The one module that reads and writes Firestore. Screens go through it, never through
 * `firebase/firestore` directly. It takes the Firestore instance and a clock, so tests can
 * point it at the emulator and fix the date.
 */

import {
  arrayUnion,
  collection,
  deleteDoc,
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
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';

/** The status pill's states for today's Order List. */
export type OrderListStatus = 'none' | 'open' | 'locked';

/** One Item a Member added; adding the same Item twice gives two lines. */
export type OrderLine = {
  id: string;
  /** The Item's name as first entered in the Catalog. */
  itemName: string;
};

/** An Item in the Catalog. */
export type CatalogItem = {
  /** The trimmed, lower-cased name. */
  id: string;
  /** The name as first entered. */
  name: string;
};

/** The Catalog split for one Member: the Items they have ordered before, and the rest. */
export type Catalog = {
  usuals: CatalogItem[];
  everythingElse: CatalogItem[];
};

/** True when the Rules refused a change to an Order because its Order List isn't Open. */
export function isOrderListNotOpenError(error: unknown) {
  return (error as { code?: unknown } | null)?.code === 'permission-denied';
}

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

  /** Every Member's lines in today's Order List. */
  function todaysOrderLines() {
    return collection(db, 'orderLists', toOrderListId(clock()), 'orderLines');
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

    /**
     * Calls `onOrder` now and on every change to this Member's lines in today's Order List,
     * oldest first. Returns a function that stops watching.
     */
    watchMyOrder(memberKey: string, onOrder: (lines: OrderLine[]) => void) {
      const addedAt = (line: QueryDocumentSnapshot) =>
        (line.get('addedAt', { serverTimestamps: 'estimate' }) as Timestamp).toMillis();
      return onSnapshot(query(todaysOrderLines(), where('memberKey', '==', memberKey)), (snapshot) => {
        const lines = [...snapshot.docs].sort((a, b) => addedAt(a) - addedAt(b));
        onOrder(lines.map((line) => ({ id: line.id, itemName: line.get('itemName') })));
      });
    },

    /**
     * Calls `onCatalog` now and on every change to the Catalog or this Member's usual Items,
     * with both parts ordered by name, ignoring case. Returns a function that stops watching.
     */
    watchCatalog(memberKey: string, onCatalog: (catalog: Catalog) => void) {
      let items: CatalogItem[] | undefined;
      let usualIds: string[] | undefined;
      function report() {
        if (!items || !usualIds) {
          return;
        }
        const usual = new Set(usualIds);
        onCatalog({
          usuals: items.filter((item) => usual.has(item.id)),
          everythingElse: items.filter((item) => !usual.has(item.id)),
        });
      }
      // Documents come in id order, and an Item's id is its lower-cased name.
      const stopCatalog = onSnapshot(collection(db, 'catalog'), (snapshot) => {
        items = snapshot.docs.map((item) => ({ id: item.id, name: item.get('name') }));
        report();
      });
      const stopUsuals = onSnapshot(doc(db, 'usualItems', memberKey), (snapshot) => {
        usualIds = snapshot.get('itemIds') ?? [];
        report();
      });
      return () => {
        stopCatalog();
        stopUsuals();
      };
    },

    /**
     * Adds an Item to the Member's Order in today's Order List and to their usual Items. The
     * name is trimmed; an exact case-insensitive match reuses the Catalog Item, any other name
     * joins the Catalog. Rejects if the name is empty, or if the Rules refuse because the Order
     * List isn't Open.
     */
    async addItem(member: { key: string; name: string }, typedName: string) {
      const name = typedName.trim();
      if (!name) {
        throw new Error('An Item name cannot be empty.');
      }
      const item = doc(db, 'catalog', name.toLowerCase());
      const line = doc(todaysOrderLines());
      const usuals = doc(db, 'usualItems', member.key);
      // One write: a refused line leaves the Catalog and usual Items unchanged.
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(item);
        if (!existing.exists()) {
          transaction.set(item, { name });
        }
        transaction.set(line, {
          memberKey: member.key,
          memberName: member.name,
          itemId: item.id,
          itemName: existing.exists() ? existing.get('name') : name,
          addedAt: serverTimestamp(),
        });
        transaction.set(usuals, { itemIds: arrayUnion(item.id) }, { merge: true });
      });
    },

    /** Removes one line from today's Order List. Rejects if the Rules refuse because it isn't Open. */
    removeOrderLine(lineId: string) {
      return deleteDoc(doc(todaysOrderLines(), lineId));
    },

    /** Resolves to whether `pin` is the Admin PIN, read from Firestore and compared on the device. */
    async checkAdminPin(pin: string) {
      const snapshot = await getDoc(doc(db, 'config', 'admin'));
      return snapshot.get('pin') === pin;
    },
  };
}
