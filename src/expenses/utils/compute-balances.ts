export interface BalanceUserRef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface NetBalance {
  user: BalanceUserRef;
  /** Positive = others owe this user; negative = this user owes. Paise. */
  netPaise: number;
}

export interface SuggestedSettlement {
  from: BalanceUserRef;
  to: BalanceUserRef;
  amountPaise: number;
}

export interface GroupBalancesResult {
  balances: NetBalance[];
  settlements: SuggestedSettlement[];
}

/**
 * Net positions from expenses:
 * - payer gains +amountPaise
 * - each share holder loses -share.amountPaise
 */
export function computeNetBalances(
  members: BalanceUserRef[],
  expenses: Array<{
    amountPaise: number;
    paidByUserId: number;
    shares: Array<{ userId: number; amountPaise: number }>;
  }>,
): Map<number, number> {
  const net = new Map<number, number>();
  for (const m of members) {
    net.set(m.id, 0);
  }

  for (const expense of expenses) {
    if (!net.has(expense.paidByUserId)) {
      net.set(expense.paidByUserId, 0);
    }
    net.set(
      expense.paidByUserId,
      (net.get(expense.paidByUserId) ?? 0) + expense.amountPaise,
    );

    for (const share of expense.shares) {
      if (!net.has(share.userId)) {
        net.set(share.userId, 0);
      }
      net.set(share.userId, (net.get(share.userId) ?? 0) - share.amountPaise);
    }
  }

  return net;
}

/**
 * Recorded repayments: `from` paid `to`.
 * - from (debtor) net += amount
 * - to (creditor) net -= amount
 */
export function applySettlements(
  net: Map<number, number>,
  settlements: Array<{
    fromUserId: number;
    toUserId: number;
    amountPaise: number;
  }>,
): void {
  for (const s of settlements) {
    if (!net.has(s.fromUserId)) {
      net.set(s.fromUserId, 0);
    }
    if (!net.has(s.toUserId)) {
      net.set(s.toUserId, 0);
    }
    net.set(s.fromUserId, (net.get(s.fromUserId) ?? 0) + s.amountPaise);
    net.set(s.toUserId, (net.get(s.toUserId) ?? 0) - s.amountPaise);
  }
}

/**
 * Greedy debt simplification: debtors pay creditors until settled.
 * Deterministic: sort by user id then amount.
 */
export function simplifyDebts(
  usersById: Map<number, BalanceUserRef>,
  net: Map<number, number>,
): SuggestedSettlement[] {
  const debtors: Array<{ userId: number; amount: number }> = [];
  const creditors: Array<{ userId: number; amount: number }> = [];

  for (const [userId, amount] of net) {
    if (amount < 0) debtors.push({ userId, amount: -amount });
    else if (amount > 0) creditors.push({ userId, amount });
  }

  debtors.sort((a, b) => a.userId - b.userId || b.amount - a.amount);
  creditors.sort((a, b) => a.userId - b.userId || b.amount - a.amount);

  const settlements: SuggestedSettlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      const from = usersById.get(debtors[i].userId);
      const to = usersById.get(creditors[j].userId);
      if (from && to) {
        settlements.push({ from, to, amountPaise: pay });
      }
      debtors[i].amount -= pay;
      creditors[j].amount -= pay;
    }
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }

  return settlements;
}

export function buildGroupBalances(
  members: BalanceUserRef[],
  expenses: Array<{
    amountPaise: number;
    paidByUserId: number;
    shares: Array<{ userId: number; amountPaise: number }>;
  }>,
  recordedSettlements: Array<{
    fromUserId: number;
    toUserId: number;
    amountPaise: number;
  }> = [],
): GroupBalancesResult {
  const usersById = new Map(members.map((m) => [m.id, m]));
  const net = computeNetBalances(members, expenses);
  applySettlements(net, recordedSettlements);

  const balances: NetBalance[] = members
    .map((user) => ({
      user,
      netPaise: net.get(user.id) ?? 0,
    }))
    .sort((a, b) => b.netPaise - a.netPaise || a.user.id - b.user.id);

  /** Suggested transfers to clear remaining nets (not persisted). */
  const settlements = simplifyDebts(usersById, net);

  return { balances, settlements };
}
