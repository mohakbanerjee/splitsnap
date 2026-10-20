import { normalizeReceipt } from "@/lib/receipt";
import type { Receipt } from "@/lib/types";

const sample = {
  restaurant: "Bella Cucina",
  currency: "USD",
  items: [
    { id: "item-1", name: "Burrata & Heirloom Tomato", price: 14, qty: 1 },
    { id: "item-2", name: "Caesar Salad", price: 13.5, qty: 1 },
    { id: "item-3", name: "Margherita Pizza", price: 18, qty: 1 },
    { id: "item-4", name: "Rigatoni Bolognese", price: 22, qty: 1 },
    { id: "item-5", name: "Grilled Salmon", price: 29, qty: 1 },
    { id: "item-6", name: "Truffle Fries", price: 9.5, qty: 1 },
    { id: "item-7", name: "Tiramisu", price: 11, qty: 1 },
    { id: "item-8", name: "Sparkling Water", price: 4, qty: 2 },
  ],
  subtotal: 125,
  tax: 10.63,
  tip: 22.5,
  total: 158.13,
};

export const SAMPLE_RECEIPT: Receipt = normalizeReceipt(sample);
