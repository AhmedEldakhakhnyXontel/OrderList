import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useByMember, usePastOrderLists, useShopping } from '@/hooks/use-order-list-views';

type ViewName = 'shopping' | 'byMember' | 'history';

const VIEW_LABELS: Record<ViewName, string> = {
  shopping: 'Shopping',
  byMember: 'By member',
  history: 'History',
};

/**
 * The Admin's Shopping / By member switch over one Order List's lines, with a History option
 * when `withHistory` is set. Read-only.
 */
export function OrderListViews({
  orderListId,
  withHistory = false,
}: {
  orderListId: string;
  withHistory?: boolean;
}) {
  const [view, setView] = useState<ViewName>('shopping');
  const options: ViewName[] = withHistory
    ? ['shopping', 'byMember', 'history']
    : ['shopping', 'byMember'];

  return (
    <ThemedView type="backgroundElement" style={styles.views}>
      <ThemedView type="backgroundElement" style={styles.switch}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => setView(option)}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
              type={option === view ? 'backgroundSelected' : 'background'}
              style={styles.button}>
              <ThemedText type={option === view ? 'smallBold' : 'small'}>
                {VIEW_LABELS[option]}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>
      {view === 'shopping' && <ShoppingView orderListId={orderListId} />}
      {view === 'byMember' && <ByMemberView orderListId={orderListId} />}
      {view === 'history' && <HistoryView />}
    </ThemedView>
  );
}

/** Each Item with its total count across all Orders, so the Admin can buy without tallying. */
function ShoppingView({ orderListId }: { orderListId: string }) {
  const items = useShopping(orderListId);

  if (items?.length === 0) {
    return <NoOrders />;
  }
  return items?.map((item) => (
    <ThemedText key={item.itemId}>
      {item.count} × {item.itemName}
    </ThemedText>
  ));
}

/** Each Member with their Order, so the Admin can hand out the food. */
function ByMemberView({ orderListId }: { orderListId: string }) {
  const orders = useByMember(orderListId);

  if (orders?.length === 0) {
    return <NoOrders />;
  }
  return orders?.map((order) => (
    <ThemedText key={order.memberKey}>
      <ThemedText type="smallBold">{order.memberName}: </ThemedText>
      {order.itemNames.join(', ')}
    </ThemedText>
  ));
}

/** Past Order Lists by date, newest first; choosing one shows its views, read-only. */
function HistoryView() {
  const orderListIds = usePastOrderLists();
  const [chosenId, setChosenId] = useState<string | null>(null);

  if (orderListIds?.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        No past Order Lists yet.
      </ThemedText>
    );
  }
  return orderListIds?.map((orderListId) => (
    <ThemedView key={orderListId} type="backgroundElement" style={styles.pastOrderList}>
      <Pressable
        onPress={() => setChosenId(orderListId === chosenId ? null : orderListId)}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView
          type={orderListId === chosenId ? 'backgroundSelected' : 'background'}
          style={styles.button}>
          <ThemedText type={orderListId === chosenId ? 'smallBold' : 'small'}>
            {orderListId}
          </ThemedText>
        </ThemedView>
      </Pressable>
      {orderListId === chosenId && <OrderListViews orderListId={orderListId} />}
    </ThemedView>
  ));
}

function NoOrders() {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      No Orders yet.
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  views: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  switch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pastOrderList: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    gap: Spacing.two,
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
