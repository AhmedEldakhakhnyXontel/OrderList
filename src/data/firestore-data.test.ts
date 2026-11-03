/**
 * @jest-environment node
 *
 * Runs inside the Firestore emulator with the project's Security Rules loaded: `npm test`.
 */
/// <reference types="node" />

import { request } from 'node:http';

import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getFirestore, setDoc } from 'firebase/firestore';

import { createFirestoreData, type Clock, type OrderListStatus } from '@/data/firestore-data';

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
