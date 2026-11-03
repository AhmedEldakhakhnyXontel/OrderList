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

/** One Item in an Order List's Shopping view. */
export type ShoppingItem = {
  itemId: string;
  itemName: string;
  /** How many lines hold this Item across all Orders. */
  count: number;
};

/** One Member's Order in an Order List's By member view. */
export type MemberOrder = {
  memberKey: string;
  /** The Member's name as in their first line. */
  memberName: string;
  /** One name per line, oldest first. */
  itemNames: string[];
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

/** Sorts lines oldest first; a line still being written has an estimated time. */
function oldestFirst(lines: QueryDocumentSnapshot[]) {
  const addedAt = (line: QueryDocumentSnapshot) =>
    (line.get('addedAt', { serverTimestamps: 'estimate' }) as Timestamp).toMillis();
  return [...lines].sort((a, b) => addedAt(a) - addedAt(b));
}

export function createFirestoreData(db: Firestore, clock: Clock) {
  /** Rejects if today has no Order List. */
  function setTodaysOrderListStatus(status: 'open' | 'locked') {
    return updateDoc(doc(db, 'orderLists', toOrderListId(clock())), {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  /** Every Member's lines in an Order List. */
  function orderLines(orderListId: string) {
    return collection(db, 'orderLists', orderListId, 'orderLines');
  }

  /** Every Member's lines in today's Order List. */
  function todaysOrderLines() {
    return orderLines(toOrderListId(clock()));
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

    /** Today's Order List id, for watching its Shopping and By member views. */
    todaysOrderListId() {
      return toOrderListId(clock());
    },

    /**
     * Calls `onItems` now and on every change to an Order List's lines, with each Item and
     * its total count across all Orders, by Item name. Returns a function that stops watching.
     */
    watchShopping(orderListId: string, onItems: (items: ShoppingItem[]) => void) {
      return onSnapshot(orderLines(orderListId), (snapshot) => {
        const items = new Map<string, ShoppingItem>();
        for (const line of snapshot.docs) {
          const itemId: string = line.get('itemId');
          const item = items.get(itemId) ?? { itemId, itemName: line.get('itemName'), count: 0 };
          item.count += 1;
          items.set(itemId, item);
        }
        onItems([...items.values()].sort((a, b) => a.itemId.localeCompare(b.itemId)));
      });
    },

    /**
     * Calls `onOrders` now and on every change to an Order List's lines, with each Member's
     * Order, by Member name. Returns a function that stops watching.
     */
    watchByMember(orderListId: string, onOrders: (orders: MemberOrder[]) => void) {
      return onSnapshot(orderLines(orderListId), (snapshot) => {
        const orders = new Map<string, MemberOrder>();
        for (const line of oldestFirst(snapshot.docs)) {
          const memberKey: string = line.get('memberKey');
          const order: MemberOrder = orders.get(memberKey) ?? {
            memberKey,
            memberName: line.get('memberName'),
            itemNames: [],
          };
          order.itemNames.push(line.get('itemName'));
          orders.set(memberKey, order);
        }
        onOrders([...orders.values()].sort((a, b) => a.memberKey.localeCompare(b.memberKey)));
      });
    },

    /**
     * Calls `onOrder` now and on every change to this Member's lines in today's Order List,
     * oldest first. Returns a function that stops watching.
     */
    watchMyOrder(memberKey: string, onOrder: (lines: OrderLine[]) => void) {
      return onSnapshot(query(todaysOrderLines(), where('memberKey', '==', memberKey)), (snapshot) => {
        const lines = oldestFirst(snapshot.docs);
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
