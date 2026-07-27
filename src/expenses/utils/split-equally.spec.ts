import { splitEquallyPaise } from './split-equally';

describe('splitEquallyPaise', () => {
  it('splits evenly when divisible', () => {
    expect(splitEquallyPaise(300, 3)).toEqual([100, 100, 100]);
  });

  it('gives remainder paise to the first participants', () => {
    // 100 / 3 = 33 each, remainder 1 → first person gets 34
    expect(splitEquallyPaise(100, 3)).toEqual([34, 33, 33]);
  });

  it('preserves the total exactly', () => {
    const amount = 1001;
    const shares = splitEquallyPaise(amount, 7);
    expect(shares.reduce((sum, n) => sum + n, 0)).toBe(amount);
  });
});
