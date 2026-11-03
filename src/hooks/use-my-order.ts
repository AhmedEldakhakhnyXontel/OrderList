import { useEffect, useState } from 'react';

import { getAppData } from '@/data/app-data';
import type { OrderLine } from '@/data/firestore-data';

/** This Member's lines in today's Order List, updated live. `null` until the first answer from Firestore. */
export function useMyOrder(memberKey: string | undefined) {
  const [lines, setLines] = useState<OrderLine[] | null>(null);

  useEffect(() => {
    if (memberKey) {
      return getAppData().watchMyOrder(memberKey, setLines);
    }
  }, [memberKey]);

  return lines;
}
