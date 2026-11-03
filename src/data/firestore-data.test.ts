/**
 * @jest-environment node
 *
 * Runs inside the Firestore emulator with the project's Security Rules loaded: `npm test`.
 */
/// <reference types="node" />

import { request } from 'node:http';

import { deleteApp, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getFirestore, setDoc } from 'firebase/firestore';

import { createFirestoreData, type Clock, type OrderListStatus } from '@/data/firestore-data';

const projectId = 'demo-orderlist';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';

const app = initializeApp({ projectId });
const db = getFirestore(app);
const [host, port] = emulatorHost.split(':');
connectFirestoreEmulator(db, host, Number(port));

// Both are 2 November 2026 in local time. In any time zone other than UTC, one of them
// falls on another day in UTC, so a UTC-based Order List id would miss today's list.
const justAfterMidnight: Clock = () => new Date(2026, 10, 2, 0, 5);
const justBeforeMidnight: Clock = () => new Date(2026, 10, 2, 23, 55);

/**
 * Stands in for the Admin in the Firebase console: the data module can't open or lock
 * an Order List yet (OrderList-df2.6).
 */
function setTodaysOrderList(status: 'open' | 'locked') {
  return setDoc(doc(db, 'orderLists', '2026-11-02'), { status });
}

/** The first status a watcher of today's Order List sees. */
function firstStatus(clock: Clock) {
  return new Promise<OrderListStatus>((resolve) => {
    const stop = createFirestoreData(db, clock).watchTodaysOrderListStatus((status) => {
      stop();
      resolve(status);
    });
  });
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

afterAll(() => deleteApp(app));

test('there is no list today until the Admin opens one', async () => {
  expect(await firstStatus(justAfterMidnight)).toBe('none');
});

test("today's list is Open", async () => {
  await setTodaysOrderList('open');

  expect(await firstStatus(justAfterMidnight)).toBe('open');
});

test("today's list is Locked", async () => {
  await setTodaysOrderList('locked');

  expect(await firstStatus(justBeforeMidnight)).toBe('locked');
});

test('a watcher sees the status change', async () => {
  await setTodaysOrderList('open');
  const seen: OrderListStatus[] = [];

  await new Promise<void>((resolve) => {
    const stop = createFirestoreData(db, justAfterMidnight).watchTodaysOrderListStatus((status) => {
      seen.push(status);
      if (status === 'open') {
        setTodaysOrderList('locked');
      } else {
        stop();
        resolve();
      }
    });
  });

  expect(seen).toEqual(['open', 'locked']);
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
