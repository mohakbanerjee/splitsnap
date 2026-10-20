import type { TipPercent } from "@/lib/money";

export type Step = "landing" | "reading" | "review" | "split" | "pay" | "done";

export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type Receipt = {
  restaurant: string;
  currency: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
};

export type Person = {
  id: string;
  name: string;
  emoji: string;
  color: string;
};

export type PaymentRecord = {
  personId: string;
  orderId: string;
};

export type ExplanationSource = "ai" | "fallback";

export type SessionState = {
  step: Step;
  receipt: Receipt | null;
  people: Person[];
  assignments: Record<string, string[]>;
  payments: PaymentRecord[];
  explanation: string | null;
  explanationSource: ExplanationSource | null;
  tipPercent: TipPercent | null;
};

export type ItemShare = {
  itemId: string;
  name: string;
  lineCents: number;
  shareCents: number;
  sharedWith: number;
  people: string[];
};

export type PersonShare = {
  personId: string;
  name: string;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  items: ItemShare[];
};

export type SplitResult = {
  shares: PersonShare[];
  unassignedItemIds: string[];
  receiptSubtotalCents: number;
  receiptTaxCents: number;
  receiptTipCents: number;
  receiptTotalCents: number;
  peopleTotalCents: number;
  isBalanced: boolean;
};
