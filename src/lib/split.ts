import { fromCents, formatMoney, toCents } from "@/lib/money";
import { lineCents } from "@/lib/receipt";
import type { Person, PersonShare, Receipt, SplitResult } from "@/lib/types";

function splitEven(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  let remainder = totalCents - base * count;
  return Array.from({ length: count }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });
}

function allocateByWeight(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalCents <= 0 || weightSum <= 0) return weights.map(() => 0);

  const shares = weights.map((weight) => Math.floor((totalCents * weight) / weightSum));
  const leftover = totalCents - shares.reduce((sum, share) => sum + share, 0);
  if (leftover > 0) {
    let largest = 0;
    for (let index = 1; index < weights.length; index += 1) {
      if (weights[index] > weights[largest]) largest = index;
    }
    shares[largest] += leftover;
  }
  return shares;
}

export function computeSplit(
  receipt: Receipt,
  people: Person[],
  assignments: Record<string, string[]>,
): SplitResult {
  const shares: PersonShare[] = people.map((person) => ({
    personId: person.id,
    name: person.name,
    subtotalCents: 0,
    taxCents: 0,
    tipCents: 0,
    totalCents: 0,
    items: [],
  }));
  const shareById = new Map(shares.map((share) => [share.personId, share]));
  const unassignedItemIds: string[] = [];

  for (const item of receipt.items) {
    const assignees = people.filter((person) => (assignments[item.id] ?? []).includes(person.id));
    const itemTotal = lineCents(item);
    if (assignees.length === 0) {
      unassignedItemIds.push(item.id);
      continue;
    }
    const portions = splitEven(itemTotal, assignees.length);
    const names = assignees.map((person) => person.name);
    assignees.forEach((person, index) => {
      const share = shareById.get(person.id);
      if (!share) return;
      share.items.push({
        itemId: item.id,
        name: item.name,
        lineCents: itemTotal,
        shareCents: portions[index] ?? 0,
        sharedWith: assignees.length,
        people: names,
      });
      share.subtotalCents += portions[index] ?? 0;
    });
  }

  const taxShares = allocateByWeight(
    toCents(receipt.tax),
    shares.map((share) => share.subtotalCents),
  );
  const tipShares = allocateByWeight(
    toCents(receipt.tip),
    shares.map((share) => share.subtotalCents),
  );

  shares.forEach((share, index) => {
    share.taxCents = taxShares[index] ?? 0;
    share.tipCents = tipShares[index] ?? 0;
    share.totalCents = share.subtotalCents + share.taxCents + share.tipCents;
  });

  const receiptSubtotalCents = receipt.items.reduce((sum, item) => sum + lineCents(item), 0);
  const receiptTaxCents = toCents(receipt.tax);
  const receiptTipCents = toCents(receipt.tip);
  const receiptTotalCents = receiptSubtotalCents + receiptTaxCents + receiptTipCents;
  const peopleTotalCents = shares.reduce((sum, share) => sum + share.totalCents, 0);

  return {
    shares,
    unassignedItemIds,
    receiptSubtotalCents,
    receiptTaxCents,
    receiptTipCents,
    receiptTotalCents,
    peopleTotalCents,
    isBalanced: unassignedItemIds.length === 0 && peopleTotalCents === receiptTotalCents,
  };
}

export type ExplainPerson = {
  name: string;
  subtotal: string;
  tax: string;
  tip: string;
  total: string;
  items: { name: string; share: string; sharedWith: string[] }[];
};

export type ExplainPayload = {
  restaurant: string;
  currency: string;
  receiptTotal: string;
  people: ExplainPerson[];
  sharedItems: { name: string; people: string[] }[];
};

export function buildExplainPayload(
  receipt: Receipt,
  result: SplitResult,
): ExplainPayload {
  const sharedItems = new Map<string, { name: string; people: string[] }>();
  for (const share of result.shares) {
    for (const item of share.items) {
      if (item.sharedWith > 1 && !sharedItems.has(item.itemId)) {
        sharedItems.set(item.itemId, { name: item.name, people: item.people });
      }
    }
  }

  return {
    restaurant: receipt.restaurant,
    currency: receipt.currency,
    receiptTotal: formatMoney(result.receiptTotalCents, receipt.currency),
    people: result.shares.map((share) => ({
      name: share.name,
      subtotal: formatMoney(share.subtotalCents, receipt.currency),
      tax: formatMoney(share.taxCents, receipt.currency),
      tip: formatMoney(share.tipCents, receipt.currency),
      total: formatMoney(share.totalCents, receipt.currency),
      items: share.items.map((item) => ({
        name: item.name,
        share: formatMoney(item.shareCents, receipt.currency),
        sharedWith: item.sharedWith > 1 ? item.people : [],
      })),
    })),
    sharedItems: [...sharedItems.values()],
  };
}

export function explainLocally(payload: ExplainPayload): string {
  const who = payload.people
    .map(
      (person) =>
        `${person.name} owes ${person.total} (${person.subtotal} of food, ${person.tax} tax, ${person.tip} tip)`,
    )
    .join("; ");
  const shared =
    payload.sharedItems.length > 0
      ? `Shared dishes are ${payload.sharedItems
          .map((item) => `${item.name} (${item.people.join(" and ")})`)
          .join(", ")}.`
      : "Each dish is assigned to one person.";
  return `At ${payload.restaurant}, ${who}. ${shared} Tax and tip follow each person's food subtotal, and any leftover cents go to the largest share so everyone together pays exactly ${payload.receiptTotal}.`;
}

export function amountFromCents(cents: number): string {
  return fromCents(cents).toFixed(2);
}
