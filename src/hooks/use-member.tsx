/**
 * The Member using this device, remembered across restarts, and whether they are the Admin.
 * Storage is only read in an effect, never at module scope: web is server-rendered.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

const STORAGE_KEY = 'member-name';
/** Set once the Admin PIN was entered, so a name admin remembered without it is not trusted. */
const ADMIN_STORAGE_KEY = 'member-is-admin';

/** The Member key reserved for the Admin: choosing it needs the Admin PIN. */
export const ADMIN_KEY = 'admin';

export type Member = {
  /** Lower-cased name; two Members with the same key are the same Member. */
  key: string;
  /** The name as typed, trimmed. */
  name: string;
};

/** Returns the Member for a typed name, or `null` if the name is empty. */
export function toMember(typedName: string): Member | null {
  const name = typedName.trim();
  return name ? { key: name.toLowerCase(), name } : null;
}

type MemberContextValue = {
  member: Member | null;
  /** True when this device's Member is the Admin. */
  isAdmin: boolean;
  /** True until the remembered name has been read from storage. */
  isLoading: boolean;
  /** Remembers the Member. Pass the Admin's key only after the Admin PIN check passed. */
  remember: (member: Member) => void;
};

const MemberContext = createContext<MemberContextValue | null>(null);

export function MemberProvider({ children }: PropsWithChildren) {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(ADMIN_STORAGE_KEY)])
      .then(([name, isAdmin]) => {
        const remembered = name === null ? null : toMember(name);
        // The name admin remembered without the PIN is no one: ask for a name again.
        setMember(remembered?.key === ADMIN_KEY && isAdmin !== 'true' ? null : remembered);
      })
      .finally(() => setIsLoading(false));
  }, []);

  function remember(next: Member) {
    setMember(next);
    AsyncStorage.setItem(STORAGE_KEY, next.name);
    if (next.key === ADMIN_KEY) {
      AsyncStorage.setItem(ADMIN_STORAGE_KEY, 'true');
    } else {
      AsyncStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  }

  const isAdmin = member?.key === ADMIN_KEY;
  return <MemberContext value={{ member, isAdmin, isLoading, remember }}>{children}</MemberContext>;
}

export function useMember() {
  const value = use(MemberContext);
  if (!value) {
    throw new Error('useMember must be used inside a MemberProvider');
  }
  return value;
}
