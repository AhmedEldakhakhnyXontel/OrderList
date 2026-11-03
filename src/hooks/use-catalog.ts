import { useEffect, useState } from 'react';

import { getAppData } from '@/data/app-data';
import type { Catalog } from '@/data/firestore-data';

/** The Catalog split into this Member's usuals and everything else, updated live. `null` until the first answer from Firestore. */
export function useCatalog(memberKey: string | undefined) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    if (memberKey) {
      return getAppData().watchCatalog(memberKey, setCatalog);
    }
  }, [memberKey]);

  return catalog;
}
