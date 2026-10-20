import { detectTipPercent, fromCents, toCents, type TipPercent } from "@/lib/money";
import type { Receipt, ReceiptItem } from "@/lib/types";

function cleanString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function nonNegativeMoney(value: unknown): number {
  const numeric =
    typeof value === "string" ? Number(value.replace(/[$,]/g, "")) : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return fromCents(Math.min(toCents(numeric), 9_999_900));
}

function normalizeItem(input: unknown, index: number, usedIds: Set<string>): ReceiptItem {
  if (!input || typeof input !== "object") {
    throw new Error(`Item ${index + 1} was incomplete.`);
  }
  const data = input as Record<string, unknown>;
  const name = cleanString(data.name).slice(0, 80);
  if (!name) throw new Error(`Item ${index + 1} is missing a name.`);

  const qtyValue = Number(data.qty ?? 1);
  const qty = Number.isFinite(qtyValue) ? Math.min(99, Math.max(1, Math.round(qtyValue))) : 1;
  const price = nonNegativeMoney(data.price);

  let id = cleanString(data.id).slice(0, 40) || `item-${index + 1}`;
  if (usedIds.has(id)) id = `${id}-${index + 1}`;
  usedIds.add(id);

  return { id, name, price, qty };
}

export function lineCents(item: Pick<ReceiptItem, "price" | "qty">): number {
  return toCents(item.price) * item.qty;
}

export function normalizeReceipt(input: unknown): Receipt {
  if (!input || typeof input !== "object") {
    throw new Error("Receipt JSON was not an object.");
  }
  const data = input as Record<string, unknown>;
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("No items were found on the receipt.");
  }
  if (data.items.length > 40) {
    throw new Error("That receipt has too many items to split here.");
  }

  const usedIds = new Set<string>();
  const items = data.items.map((item, index) => normalizeItem(item, index, usedIds));
  const currencyRaw = cleanString(data.currency).toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : "USD";
  const taxCents = toCents(nonNegativeMoney(data.tax));
  const tipCents = toCents(nonNegativeMoney(data.tip));
  const subtotalCents = items.reduce((sum, item) => sum + lineCents(item), 0);

  return {
    restaurant: cleanString(data.restaurant).slice(0, 80) || "Restaurant",
    currency,
    items,
    subtotal: fromCents(subtotalCents),
    tax: fromCents(taxCents),
    tip: fromCents(tipCents),
    total: fromCents(subtotalCents + taxCents + tipCents),
  };
}

export function recalculateReceipt(receipt: Receipt, tipPercent: TipPercent | null): Receipt {
  const subtotalCents = receipt.items.reduce((sum, item) => sum + lineCents(item), 0);
  const taxCents = toCents(receipt.tax);
  const tipCents =
    tipPercent === null ? toCents(receipt.tip) : Math.round((subtotalCents * tipPercent) / 100);
  return {
    ...receipt,
    subtotal: fromCents(subtotalCents),
    tax: fromCents(taxCents),
    tip: fromCents(tipCents),
    total: fromCents(subtotalCents + taxCents + tipCents),
  };
}

export function tipPercentForReceipt(receipt: Receipt): TipPercent | null {
  return detectTipPercent(
    receipt.items.reduce((sum, item) => sum + lineCents(item), 0),
    toCents(receipt.tip),
  );
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in the model response.");
  return JSON.parse(body.slice(start, end + 1)) as unknown;
}
