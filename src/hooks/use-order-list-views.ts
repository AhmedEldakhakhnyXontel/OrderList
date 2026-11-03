import { useEffect, useState } from 'react';

import { getAppData } from '@/data/app-data';
import type { MemberOrder, ShoppingItem } from '@/data/firestore-data';

/** An Order List's Shopping view, updated live. `null` until the first answer from Firestore. */
export function useShopping(orderListId: string) {
  const [items, setItems] = useState<ShoppingItem[] | null>(null);

  useEffect(() => getAppData().watchShopping(orderListId, setItems), [orderListId]);

  return items;
}

/** An Order List's By member view, updated live. `null` until the first answer from Firestore. */
export function useByMember(orderListId: string) {
  const [orders, setOrders] = useState<MemberOrder[] | null>(null);

  useEffect(() => getAppData().watchByMember(orderListId, setOrders), [orderListId]);

  return orders;
}

/** The ids (dates) of past Order Lists, newest first, updated live. `null` until the first answer from Firestore. */
export function usePastOrderLists() {
  const [orderListIds, setOrderListIds] = useState<string[] | null>(null);

  useEffect(() => getAppData().watchPastOrderLists(setOrderListIds), []);

  return orderListIds;
}
