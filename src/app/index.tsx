import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getAppData } from '@/data/app-data';
import type { OrderListStatus } from '@/data/firestore-data';
import { useMember } from '@/hooks/use-member';
import { useTodaysOrderListStatus } from '@/hooks/use-order-list-status';

const STATUS_LABELS: Record<OrderListStatus, string> = {
  none: 'No list today',
  open: 'Open',
  locked: 'Locked',
};

/** The Admin card's action on today's Order List, for each status. */
const ADMIN_ACTION_LABELS: Record<OrderListStatus, string> = {
  none: 'Open',
  open: 'Lock',
  locked: 'Unlock',
};

export default function OrderScreen() {
  const { member, isAdmin, isLoading } = useMember();
  const status = useTodaysOrderListStatus();
  const [isChangingList, setIsChangingList] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  async function changeTodaysOrderList(current: OrderListStatus) {
    const data = getAppData();
    setIsChangingList(true);
    setAdminError(null);
    try {
      if (current === 'none') {
        await data.openTodaysOrderList();
      } else if (current === 'open') {
        await data.lockTodaysOrderList();
      } else {
        await data.unlockTodaysOrderList();
      }
    } catch {
      setAdminError("Couldn't change today's Order List. Check your connection and try again.");
    } finally {
      setIsChangingList(false);
    }
  }

  if (isLoading) {
    return <ThemedView style={styles.container} />;
  }
  if (!member) {
    return <Redirect href="/name" />;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* The Admin's controls; only the Admin ever sees this card. */}
        {isAdmin && (
          <ThemedView type="backgroundElement" style={styles.adminCard}>
            <ThemedText type="smallBold">Admin</ThemedText>
            {status && (
              <Pressable
                onPress={() => changeTodaysOrderList(status)}
                disabled={isChangingList}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundSelected" style={styles.button}>
                  <ThemedText type="smallBold">{ADMIN_ACTION_LABELS[status]}</ThemedText>
                </ThemedView>
              </Pressable>
            )}
            {adminError && (
              <ThemedText type="small" themeColor="textSecondary">
                {adminError}
              </ThemedText>
            )}
          </ThemedView>
        )}

        <ThemedView style={styles.greeting}>
          <ThemedText type="subtitle">Hi, {member.name}</ThemedText>
          {status && (
            <ThemedView type="backgroundSelected" style={styles.pill}>
              <ThemedText type="small">{STATUS_LABELS[status]}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        <Link href="/name" asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.button}>
              <ThemedText type="small">Switch name</ThemedText>
            </ThemedView>
          </Pressable>
        </Link>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  adminCard: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  greeting: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
