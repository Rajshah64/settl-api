/**
 * Equal split in integer paise.
 * Remainder (amount % n) is given +1 paise to the first `remainder`
 * participants in stable input order — deterministic, never loses paise.
 */
export function splitEquallyPaise(
  amountPaise: number,
  participantCount: number,
): number[] {
  if (participantCount < 1) {
    throw new Error('participantCount must be >= 1');
  }
  if (amountPaise < 1) {
    throw new Error('amountPaise must be >= 1');
  }

  const base = Math.floor(amountPaise / participantCount);
  const remainder = amountPaise % participantCount;

  return Array.from({ length: participantCount }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}
