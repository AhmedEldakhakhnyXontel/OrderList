import { Link, Redirect } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { OrderListStatus } from '@/data/firestore-data';
import { useMember } from '@/hooks/use-member';
import { useTodaysOrderListStatus } from '@/hooks/use-order-list-status';

const STATUS_LABELS: Record<OrderListStatus, string> = {
  none: 'No list today',
  open: 'Open',
  locked: 'Locked',
};

export default function OrderScreen() {
  const { member, isAdmin, isLoading } = useMember();
  const status = useTodaysOrderListStatus();

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
