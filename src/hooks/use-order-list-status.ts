import { useEffect, useState } from 'react';

import { getAppData } from '@/data/app-data';
import type { OrderListStatus } from '@/data/firestore-data';

/** Today's Order List status, updated live. `null` until the first answer from Firestore. */
export function useTodaysOrderListStatus() {
  const [status, setStatus] = useState<OrderListStatus | null>(null);

  useEffect(() => getAppData().watchTodaysOrderListStatus(setStatus), []);

  return status;
}
