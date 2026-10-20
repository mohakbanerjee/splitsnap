export const TIP_PERCENTS = [0, 10, 15, 18, 20] as const;

export type TipPercent = (typeof TIP_PERCENTS)[number];

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100 + Math.sign(amount) * 1e-8);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatMoney(cents: number, currency = "USD"): string {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }
}

export function dollarsToCents(text: string): number {
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.min(9_999_900, toCents(amount));
}

export function isTipPercent(value: number): value is TipPercent {
  return (TIP_PERCENTS as readonly number[]).includes(value);
}

export function detectTipPercent(subtotalCents: number, tipCents: number): TipPercent | null {
  if (subtotalCents <= 0) return tipCents === 0 ? 0 : null;
  for (const percent of TIP_PERCENTS) {
    if (Math.round((subtotalCents * percent) / 100) === tipCents) return percent;
  }
  return null;
}
