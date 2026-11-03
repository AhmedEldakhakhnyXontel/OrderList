import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useByMember, useShopping } from '@/hooks/use-order-list-views';

type ViewName = 'shopping' | 'byMember';

const VIEW_LABELS: Record<ViewName, string> = {
  shopping: 'Shopping',
  byMember: 'By member',
};

/** The Admin's Shopping / By member switch over one Order List's lines. Read-only. */
export function OrderListViews({ orderListId }: { orderListId: string }) {
  const [view, setView] = useState<ViewName>('shopping');

  return (
    <ThemedView type="backgroundElement" style={styles.views}>
      <ThemedView type="backgroundElement" style={styles.switch}>
        {(['shopping', 'byMember'] as const).map((option) => (
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
      {view === 'shopping' ? (
        <ShoppingView orderListId={orderListId} />
      ) : (
        <ByMemberView orderListId={orderListId} />
      )}
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
  pressed: {
    opacity: 0.7,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
