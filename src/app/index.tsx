import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { OrderListViews } from '@/components/order-list-views';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getAppData } from '@/data/app-data';
import { isOrderListNotOpenError, type OrderListStatus } from '@/data/firestore-data';
import { useMember, type Member } from '@/hooks/use-member';
import { useMyOrder } from '@/hooks/use-my-order';
import { useTodaysOrderListStatus } from '@/hooks/use-order-list-status';
import { useTheme } from '@/hooks/use-theme';

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
  const myOrder = useMyOrder(member?.key);
  const theme = useTheme();
  const [typedItem, setTypedItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  // Members change their Order only while today's Order List is Open.
  const isOpen = status === 'open';
  const canAdd = isOpen && !isAdding;

  /** Runs one change to this Member's Order; resolves to whether it went through. */
  async function changeMyOrder(change: Promise<void>) {
    setOrderError(null);
    try {
      await change;
      return true;
    } catch (error) {
      setOrderError(
        isOrderListNotOpenError(error)
          ? "Today's Order List is Locked, so your Order can't change."
          : "Couldn't change your Order. Check your connection and try again.",
      );
      return false;
    }
  }

  async function addTypedItem(forMember: Member) {
    if (!typedItem.trim()) {
      setOrderError('Please type an Item name.');
      return;
    }
    setIsAdding(true);
    if (await changeMyOrder(getAppData().addItem(forMember, typedItem))) {
      setTypedItem('');
    }
    setIsAdding(false);
  }

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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
              <OrderListViews orderListId={getAppData().todaysOrderListId()} withHistory />
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

          <ThemedView style={styles.row}>
            <TextInput
              value={typedItem}
              onChangeText={(text) => {
                setTypedItem(text);
                setOrderError(null);
              }}
              onSubmitEditing={() => addTypedItem(member)}
              editable={isOpen}
              placeholder={
                isOpen ? 'Type an Item, e.g. bag of chips' : "Today's Order List isn't Open"
              }
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable
              onPress={() => addTypedItem(member)}
              disabled={!canAdd}
              style={({ pressed }) => [!canAdd && styles.disabled, pressed && styles.pressed]}>
              <ThemedView type="backgroundSelected" style={styles.button}>
                <ThemedText type="smallBold">Add</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
          {orderError && (
            <ThemedText type="small" themeColor="textSecondary">
              {orderError}
            </ThemedText>
          )}

          <ThemedText type="smallBold">My order</ThemedText>
          {myOrder?.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing yet.
            </ThemedText>
          )}
          {myOrder?.map((line) => (
            <ThemedView key={line.id} style={styles.row}>
              <ThemedText style={styles.itemName}>{line.itemName}</ThemedText>
              <Pressable
                onPress={() => changeMyOrder(getAppData().removeOrderLine(line.id))}
                disabled={!isOpen}
                style={({ pressed }) => [!isOpen && styles.disabled, pressed && styles.pressed]}>
                <ThemedView type="backgroundElement" style={styles.button}>
                  <ThemedText type="small">Remove</ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          ))}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
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
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  itemName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
