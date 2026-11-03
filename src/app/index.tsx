import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { OrderListViews } from '@/components/order-list-views';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getAppData } from '@/data/app-data';
import {
  isOrderListNotOpenError,
  itemNameProblem,
  type CatalogItem,
  type OrderListStatus,
} from '@/data/firestore-data';
import { useCatalog } from '@/hooks/use-catalog';
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

/** The most Catalog suggestions shown under the add box. */
const MAX_SUGGESTIONS = 5;

export default function OrderScreen() {
  const { member, isAdmin, isLoading } = useMember();
  const status = useTodaysOrderListStatus();
  const [isChangingList, setIsChangingList] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const myOrder = useMyOrder(member?.key);
  const catalog = useCatalog(member?.key);
  const theme = useTheme();
  const [typedItem, setTypedItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  // Members change their Order only while today's Order List is Open.
  const isOpen = status === 'open';
  const canAdd = isOpen && !isAdding;
  // Item ids are lower-cased names, so this matches what's typed in any case.
  const typedKey = typedItem.trim().toLowerCase();
  const suggestions =
    typedKey && catalog
      ? [...catalog.usuals, ...catalog.everythingElse]
          .filter((item) => item.id.includes(typedKey))
          .slice(0, MAX_SUGGESTIONS)
      : [];

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

  /** Adds the typed Item, or a suggestion for it, and clears the add box once it went through. */
  async function addTypedItem(forMember: Member, name: string) {
    if (!name.trim()) {
      setOrderError('Please type an Item name.');
      return;
    }
    const problem = itemNameProblem(name);
    if (problem) {
      setOrderError(problem);
      return;
    }
    setIsAdding(true);
    if (await changeMyOrder(getAppData().addItem(forMember, name))) {
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

  /** One chip per Item; tapping a chip adds that Item to this Member's Order. */
  function renderChips(forMember: Member, items: CatalogItem[]) {
    return (
      <ThemedView style={styles.chips}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => changeMyOrder(getAppData().addItem(forMember, item.name))}
            disabled={!isOpen}
            style={({ pressed }) => [!isOpen && styles.disabled, pressed && styles.pressed]}>
            <ThemedView type="backgroundSelected" style={styles.pill}>
              <ThemedText type="small">+ {item.name}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>
    );
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
              onSubmitEditing={() => addTypedItem(member, typedItem)}
              editable={isOpen}
              placeholder={
                isOpen ? 'Type an Item, e.g. bag of chips' : "Today's Order List isn't Open"
              }
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable
              onPress={() => addTypedItem(member, typedItem)}
              disabled={!canAdd}
              style={({ pressed }) => [!canAdd && styles.disabled, pressed && styles.pressed]}>
              <ThemedView type="backgroundSelected" style={styles.button}>
                <ThemedText type="smallBold">Add</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => addTypedItem(member, item.name)}
              disabled={!canAdd}
              style={({ pressed }) => [!canAdd && styles.disabled, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.suggestion}>
                ↳ {item.name}
              </ThemedText>
            </Pressable>
          ))}
          {orderError && (
            <ThemedText type="small" themeColor="textSecondary">
              {orderError}
            </ThemedText>
          )}

          {catalog && catalog.usuals.length > 0 && (
            <>
              <ThemedText type="smallBold">Your usuals</ThemedText>
              {renderChips(member, catalog.usuals)}
            </>
          )}
          {catalog && catalog.everythingElse.length > 0 && (
            <>
              <ThemedText type="smallBold">Everything else</ThemedText>
              {renderChips(member, catalog.everythingElse)}
            </>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  suggestion: {
    paddingLeft: Spacing.two,
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
