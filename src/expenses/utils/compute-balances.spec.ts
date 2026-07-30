import {
  buildGroupBalances,
  computeNetBalances,
  simplifyDebts,
} from './compute-balances';

describe('computeNetBalances', () => {
  const members = [
    { id: 1, firstName: 'A', lastName: 'One', email: 'a@x.com' },
    { id: 2, firstName: 'B', lastName: 'Two', email: 'b@x.com' },
    { id: 3, firstName: 'C', lastName: 'Three', email: 'c@x.com' },
  ];

  it('credits payer and debits each share', () => {
    const net = computeNetBalances(members, [
      {
        amountPaise: 300,
        paidByUserId: 1,
        shares: [
          { userId: 1, amountPaise: 100 },
          { userId: 2, amountPaise: 100 },
          { userId: 3, amountPaise: 100 },
        ],
      },
    ]);

    expect(net.get(1)).toBe(200);
    expect(net.get(2)).toBe(-100);
    expect(net.get(3)).toBe(-100);
  });
});

describe('simplifyDebts', () => {
  it('produces minimal suggested transfers', () => {
    const users = new Map([
      [1, { id: 1, firstName: 'A', lastName: 'One', email: 'a@x.com' }],
      [2, { id: 2, firstName: 'B', lastName: 'Two', email: 'b@x.com' }],
      [3, { id: 3, firstName: 'C', lastName: 'Three', email: 'c@x.com' }],
    ]);
    const net = new Map([
      [1, 200],
      [2, -100],
      [3, -100],
    ]);

    const settlements = simplifyDebts(users, net);
    expect(settlements).toHaveLength(2);
    expect(settlements.map((s) => s.amountPaise).sort()).toEqual([100, 100]);
    expect(settlements.every((s) => s.to.id === 1)).toBe(true);
  });
});

describe('buildGroupBalances', () => {
  it('returns sorted nets and settlements', () => {
    const members = [
      { id: 1, firstName: 'A', lastName: 'One', email: 'a@x.com' },
      { id: 2, firstName: 'B', lastName: 'Two', email: 'b@x.com' },
    ];
    const result = buildGroupBalances(members, [
      {
        amountPaise: 100,
        paidByUserId: 1,
        shares: [
          { userId: 1, amountPaise: 50 },
          { userId: 2, amountPaise: 50 },
        ],
      },
    ]);

    expect(result.balances[0].user.id).toBe(1);
    expect(result.balances[0].netPaise).toBe(50);
    expect(result.settlements).toEqual([
      {
        from: members[1],
        to: members[0],
        amountPaise: 50,
      },
    ]);
  });
});
