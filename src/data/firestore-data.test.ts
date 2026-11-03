/**
 * @jest-environment node
 *
 * Runs inside the Firestore emulator with the project's Security Rules loaded: `npm test`.
 */
/// <reference types="node" />

import { request } from 'node:http';

import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getFirestore, setDoc } from 'firebase/firestore';

import {
  createFirestoreData,
  isOrderListNotOpenError,
  type Clock,
  type MemberOrder,
  type OrderLine,
  type OrderListStatus,
  type ShoppingItem,
} from '@/data/firestore-data';

const projectId = 'demo-orderlist';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const [host, port] = emulatorHost.split(':');

let deviceCount = 0;

/**
 * A device that has seen nothing yet. A device's cache keeps the last status it saw, and
 * a new watcher hears the cache first, so watchers run on fresh devices to see Firestore.
 */
function newDevice() {
  deviceCount += 1;
  const deviceDb = getFirestore(initializeApp({ projectId }, `device-${deviceCount}`));
  connectFirestoreEmulator(deviceDb, host, Number(port));
  return deviceDb;
}

const db = newDevice();

// Both are 2 November 2026 in local time. In any time zone other than UTC, one of them
// falls on another day in UTC, so a UTC-based Order List id would miss today's list.
const justAfterMidnight: Clock = () => new Date(2026, 10, 2, 0, 5);
const justBeforeMidnight: Clock = () => new Date(2026, 10, 2, 23, 55);
const theDayBefore: Clock = () => new Date(2026, 10, 1, 12, 0);

/** The first status a watcher of today's Order List sees. */
function firstStatus(clock: Clock) {
  return new Promise<OrderListStatus>((resolve) => {
    const stop = createFirestoreData(newDevice(), clock).watchTodaysOrderListStatus((status) => {
      stop();
      resolve(status);
    });
  });
}

const ahmed = { key: 'ahmed', name: 'Ahmed' };
const sara = { key: 'sara', name: 'Sara' };

/** The first lines a watcher of a Member's Order in today's Order List sees. */
function firstOrder(clock: Clock, memberKey: string) {
  return new Promise<OrderLine[]>((resolve) => {
    const stop = createFirestoreData(newDevice(), clock).watchMyOrder(memberKey, (lines) => {
      stop();
      resolve(lines);
    });
  });
}

async function firstItemNames(clock: Clock, memberKey: string) {
  return (await firstOrder(clock, memberKey)).map((line) => line.itemName);
}

/** What the Admin reads in the Shopping view: each Item with its total count. */
function describeShopping(items: ShoppingItem[]) {
  return items.map((item) => `${item.count} ${item.itemName}`);
}

/** What the Admin reads in the By member view: each Member with their Items. */
function describeByMember(orders: MemberOrder[]) {
  return orders.map((order) => `${order.memberName}: ${order.itemNames.join(', ')}`);
}

/** The first History a watcher sees: the dates of past Order Lists. */
function firstPastOrderLists(clock: Clock) {
  return new Promise<string[]>((resolve) => {
    const stop = createFirestoreData(newDevice(), clock).watchPastOrderLists((orderListIds) => {
      stop();
      resolve(orderListIds);
    });
  });
}

/** The first Shopping and By member views a watcher of any Order List sees. */
async function firstViews(orderListId: string) {
  const data = createFirestoreData(newDevice(), justAfterMidnight);
  const [shopping, byMember] = await Promise.all([
    new Promise<string[]>((resolve) => {
      const stop = data.watchShopping(orderListId, (items) => {
        stop();
        resolve(describeShopping(items));
      });
    }),
    new Promise<string[]>((resolve) => {
      const stop = data.watchByMember(orderListId, (orders) => {
        stop();
        resolve(describeByMember(orders));
      });
    }),
  ]);
  return { shopping, byMember };
}

/** The first Shopping view a watcher of today's Order List sees. */
function firstShopping(clock: Clock) {
  return new Promise<string[]>((resolve) => {
    const data = createFirestoreData(newDevice(), clock);
    const stop = data.watchShopping(data.todaysOrderListId(), (items) => {
      stop();
      resolve(describeShopping(items));
    });
  });
}

/** The first By member view a watcher of today's Order List sees. */
function firstByMember(clock: Clock) {
  return new Promise<string[]>((resolve) => {
    const data = createFirestoreData(newDevice(), clock);
    const stop = data.watchByMember(data.todaysOrderListId(), (orders) => {
      stop();
      resolve(describeByMember(orders));
    });
  });
}

/** Resolves to whether the Rules refused `change` because the Order List isn't Open. */
function isRefused(change: Promise<unknown>) {
  return change.then(() => false, isOrderListNotOpenError);
}

/** Empties the emulator's database. Jest's `fetch` here is Expo's test stub, so this uses Node's own HTTP. */
function clearDatabase() {
  const url = `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  return new Promise<number | undefined>((resolve, reject) => {
    request(url, { method: 'DELETE' }, (response) => {
      response.resume();
      resolve(response.statusCode);
    })
      .on('error', reject)
      .end();
  });
}

/**
 * Stands in for the Admin setting the PIN in the Firebase console. Clients can't write the
 * PIN, so this goes through the emulator's REST API as the owner, which skips the Rules.
 */
function setAdminPin(pin: string) {
  const url = `http://${emulatorHost}/v1/projects/${projectId}/databases/(default)/documents/config/admin`;
  return new Promise<number | undefined>((resolve, reject) => {
    request(url, { method: 'PATCH', headers: { Authorization: 'Bearer owner' } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    })
      .on('error', reject)
      .end(JSON.stringify({ fields: { pin: { stringValue: pin } } }));
  });
}

beforeEach(async () => {
  expect(await clearDatabase()).toBe(200);
});

afterAll(() => Promise.all(getApps().map(deleteApp)));

test('there is no list today until the Admin opens one', async () => {
  expect(await firstStatus(justAfterMidnight)).toBe('none');
});

test("the Admin opens today's list", async () => {
  await createFirestoreData(db, justBeforeMidnight).openTodaysOrderList();

  expect(await firstStatus(justAfterMidnight)).toBe('open');
});

test("the Admin locks today's list", async () => {
  const admin = createFirestoreData(db, justAfterMidnight);
  await admin.openTodaysOrderList();
  await admin.lockTodaysOrderList();

  expect(await firstStatus(justBeforeMidnight)).toBe('locked');
});

test("opening today's list locks an older list still Open", async () => {
  await createFirestoreData(db, theDayBefore).openTodaysOrderList();

  await createFirestoreData(db, justAfterMidnight).openTodaysOrderList();

  expect(await firstStatus(theDayBefore)).toBe('locked');
  expect(await firstStatus(justAfterMidnight)).toBe('open');
});

test('a second list for the same day cannot be opened', async () => {
  const admin = createFirestoreData(db, justAfterMidnight);
  await admin.openTodaysOrderList();
  await admin.lockTodaysOrderList();

  await expect(createFirestoreData(db, justBeforeMidnight).openTodaysOrderList()).rejects.toThrow();
  expect(await firstStatus(justAfterMidnight)).toBe('locked');
});

test("a watcher on another device sees the Admin lock and unlock today's list", async () => {
  const admin = createFirestoreData(db, justAfterMidnight);
  await admin.openTodaysOrderList();
  const seen: OrderListStatus[] = [];

  await new Promise<void>((resolve) => {
    const watcher = createFirestoreData(newDevice(), justBeforeMidnight);
    const stop = watcher.watchTodaysOrderListStatus((status) => {
      seen.push(status);
      if (seen.length === 1) {
        admin.lockTodaysOrderList();
      } else if (seen.length === 2) {
        admin.unlockTodaysOrderList();
      } else {
        stop();
        resolve();
      }
    });
  });

  expect(seen).toEqual(['open', 'locked', 'open']);
});

test('the right PIN passes the Admin check', async () => {
  expect(await setAdminPin('2468')).toBe(200);

  expect(await createFirestoreData(db, justAfterMidnight).checkAdminPin('2468')).toBe(true);
});

test('a wrong PIN fails the Admin check', async () => {
  expect(await setAdminPin('2468')).toBe(200);

  expect(await createFirestoreData(db, justAfterMidnight).checkAdminPin('1357')).toBe(false);
});

test('a client cannot change the PIN', async () => {
  expect(await setAdminPin('2468')).toBe(200);

  await expect(setDoc(doc(db, 'config', 'admin'), { pin: '1357' })).rejects.toMatchObject({
    code: 'permission-denied',
  });
  const data = createFirestoreData(db, justAfterMidnight);
  expect(await data.checkAdminPin('1357')).toBe(false);
  expect(await data.checkAdminPin('2468')).toBe(true);
});

test('an Item name is trimmed, and an empty one is rejected', async () => {
  const data = createFirestoreData(db, justAfterMidnight);
  await data.openTodaysOrderList();

  await data.addItem(ahmed, '  Bag of chips  ');
  await expect(data.addItem(ahmed, '   ')).rejects.toThrow();

  expect(await firstItemNames(justBeforeMidnight, 'ahmed')).toEqual(['Bag of chips']);
});

test('a new Item joins the Catalog, and a match in any case reuses it as first entered', async () => {
  const data = createFirestoreData(db, justAfterMidnight);
  await data.openTodaysOrderList();

  await data.addItem(ahmed, 'Bag of chips');
  await data.addItem(sara, ' BAG OF CHIPS ');
  await data.addItem(sara, 'Juice');
  await data.addItem(ahmed, 'juice');

  expect(await firstItemNames(justAfterMidnight, 'ahmed')).toEqual(['Bag of chips', 'Juice']);
  expect(await firstItemNames(justAfterMidnight, 'sara')).toEqual(['Bag of chips', 'Juice']);
});

test('the same Item added twice shows twice, and removing one leaves one', async () => {
  const data = createFirestoreData(db, justAfterMidnight);
  await data.openTodaysOrderList();
  await data.addItem(ahmed, 'Juice');
  await data.addItem(ahmed, 'Juice');

  const lines = await firstOrder(justAfterMidnight, 'ahmed');
  expect(lines.map((line) => line.itemName)).toEqual(['Juice', 'Juice']);

  await data.removeOrderLine(lines[0].id);
  expect(await firstItemNames(justAfterMidnight, 'ahmed')).toEqual(['Juice']);
});

test('my Order shows only my Items, and updates live', async () => {
  const data = createFirestoreData(db, justAfterMidnight);
  await data.openTodaysOrderList();
  const seen: string[][] = [];

  await new Promise<void>((resolve) => {
    const watcher = createFirestoreData(newDevice(), justBeforeMidnight);
    const stop = watcher.watchMyOrder('ahmed', (lines) => {
      seen.push(lines.map((line) => line.itemName));
      if (seen.length === 1) {
        data.addItem(sara, 'Juice').then(() => data.addItem(ahmed, 'Bag of chips'));
      } else {
        stop();
        resolve();
      }
    });
  });

  expect(seen).toEqual([[], ['Bag of chips']]);
});

test('Shopping totals each Item across all Orders; one Member adding it twice counts 2', async () => {
  const data = createFirestoreData(db, justAfterMidnight);
  await data.openTodaysOrderList();
  await data.addItem(ahmed, 'Juice');
  await data.addItem(ahmed, 'juice');
  await data.addItem(sara, 'Bag of chips');
  await data.addItem(sara, 'Juice');

  expect(await firstShopping(justBeforeMidnight)).toEqual(['1 Bag of chips', '3 Juice']);
});

test('By member groups Items per Member, matching names case-insensitively', async () => {
  const data = createFirestoreData(db, justAfterMidnight);
  await data.openTodaysOrderList();
  await data.addItem(sara, 'Juice');
  await data.addItem(ahmed, 'Bag of chips');
  await data.addItem({ key: 'ahmed', name: 'AHMED' }, 'Juice');
  await data.addItem(ahmed, 'Juice');

  expect(await firstByMember(justBeforeMidnight)).toEqual([
    'Ahmed: Bag of chips, Juice, Juice',
    'Sara: Juice',
  ]);
});

test('Shopping and By member update live as Members add and remove Items', async () => {
  const data = createFirestoreData(db, justAfterMidnight);
  await data.openTodaysOrderList();
  await data.addItem(ahmed, 'Juice');
  const [juice] = await firstOrder(justAfterMidnight, 'ahmed');
  const watcher = createFirestoreData(newDevice(), justBeforeMidnight);
  const shopping: string[][] = [];
  const byMember: string[][] = [];

  await new Promise<void>((resolve) => {
    // Each change happens once both views have seen the one before.
    function next() {
      if (shopping.length !== byMember.length) {
        return;
      }
      if (shopping.length === 1) {
        data.addItem(sara, 'Bag of chips');
      } else if (shopping.length === 2) {
        data.removeOrderLine(juice.id);
      } else {
        stopShopping();
        stopByMember();
        resolve();
      }
    }
    const stopShopping = watcher.watchShopping(watcher.todaysOrderListId(), (items) => {
      shopping.push(describeShopping(items));
      next();
    });
    const stopByMember = watcher.watchByMember(watcher.todaysOrderListId(), (orders) => {
      byMember.push(describeByMember(orders));
      next();
    });
  });

  expect(shopping).toEqual([['1 Juice'], ['1 Bag of chips', '1 Juice'], ['1 Bag of chips']]);
  expect(byMember).toEqual([
    ['Ahmed: Juice'],
    ['Ahmed: Juice', 'Sara: Bag of chips'],
    ['Sara: Bag of chips'],
  ]);
});

test("History lists past Order Lists newest first, without today's", async () => {
  // A Friday, then the weekend with no list, then Sunday's and Monday's.
  await createFirestoreData(db, () => new Date(2026, 9, 30, 12, 0)).openTodaysOrderList();
  await createFirestoreData(db, theDayBefore).openTodaysOrderList();
  await createFirestoreData(db, justAfterMidnight).openTodaysOrderList();

  expect(await firstPastOrderLists(justBeforeMidnight)).toEqual(['2026-11-01', '2026-10-30']);
});

test("a past Order List's Shopping and By member views stay readable from History", async () => {
  const yesterday = createFirestoreData(db, theDayBefore);
  await yesterday.openTodaysOrderList();
  await yesterday.addItem(ahmed, 'Juice');
  await yesterday.addItem(sara, 'Juice');
  const today = createFirestoreData(db, justAfterMidnight);
  await today.openTodaysOrderList();
  await today.addItem(ahmed, 'Bag of chips');

  const [pastOrderListId] = await firstPastOrderLists(justBeforeMidnight);
  expect(await firstViews(pastOrderListId)).toEqual({
    shopping: ['2 Juice'],
    byMember: ['Ahmed: Juice', 'Sara: Juice'],
  });
});

test('adding and removing are refused while the list is Locked, and work again after unlock', async () => {
  const admin = createFirestoreData(db, justAfterMidnight);
  await admin.openTodaysOrderList();
  const member = createFirestoreData(newDevice(), justBeforeMidnight);
  await member.addItem(ahmed, 'Juice');
  const [juice] = await firstOrder(justAfterMidnight, 'ahmed');

  await admin.lockTodaysOrderList();
  expect(await isRefused(member.addItem(ahmed, 'Bag of chips'))).toBe(true);
  expect(await isRefused(member.removeOrderLine(juice.id))).toBe(true);
  expect(await firstItemNames(justAfterMidnight, 'ahmed')).toEqual(['Juice']);

  await admin.unlockTodaysOrderList();
  await member.addItem(ahmed, 'Bag of chips');
  await member.removeOrderLine(juice.id);
  expect(await firstItemNames(justAfterMidnight, 'ahmed')).toEqual(['Bag of chips']);
});
