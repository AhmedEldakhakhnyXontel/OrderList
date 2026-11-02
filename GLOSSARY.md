# OrderList

An internal team app where the Admin collects the team's daily food requests into one list before going to buy them.

## Language

**Admin**:
The single team member who opens and locks the Order List and buys its Items.
_Avoid_: manager, owner

**Member**:
A team member who places an Order, known only by the name they type.
_Avoid_: user, customer, requester

**Order List**:
One day's collection of Orders, opened by the Admin.
_Avoid_: order run, request list

**Locked**:
The state of an Order List once the Admin goes to buy; Members can no longer add or remove Items.
_Avoid_: closed, submitted

**Order**:
The Items one Member wants from a given Order List.
_Avoid_: request, food request

**Item**:
Something that can be ordered, such as "bag of chips".
_Avoid_: product, cached item

**Catalog**:
The shared list of every Item any Member has entered, available for anyone to pick from.
_Avoid_: cached items, menu
