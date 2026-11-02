/**
 * The Member using this device, remembered across restarts.
 * Storage is only read in an effect, never at module scope: web is server-rendered.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

const STORAGE_KEY = 'member-name';

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
  /** True until the remembered name has been read from storage. */
  isLoading: boolean;
  remember: (member: Member) => void;
};

const MemberContext = createContext<MemberContextValue | null>(null);

export function MemberProvider({ children }: PropsWithChildren) {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((name) => setMember(name === null ? null : toMember(name)))
      .finally(() => setIsLoading(false));
  }, []);

  function remember(next: Member) {
    setMember(next);
    AsyncStorage.setItem(STORAGE_KEY, next.name);
  }

  return <MemberContext value={{ member, isLoading, remember }}>{children}</MemberContext>;
}

export function useMember() {
  const value = use(MemberContext);
  if (!value) {
    throw new Error('useMember must be used inside a MemberProvider');
  }
  return value;
}
