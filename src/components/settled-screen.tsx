"use client";

import { formatMoney, toCents } from "@/lib/money";
import { lineCents } from "@/lib/receipt";
import type { PaymentRecord, PersonShare, Receipt } from "@/lib/types";

const pieces = [
  { left: "8%", delay: "0s", color: "#0070ba" },
  { left: "18%", delay: "0.15s", color: "#0f766e" },
  { left: "28%", delay: "0.05s", color: "#f59e0b" },
  { left: "40%", delay: "0.25s", color: "#7c3aed" },
  { left: "52%", delay: "0.1s", color: "#be123c" },
  { left: "63%", delay: "0.3s", color: "#0070ba" },
  { left: "74%", delay: "0.08s", color: "#0f766e" },
  { left: "86%", delay: "0.2s", color: "#f59e0b" },
  { left: "12%", delay: "0.35s", color: "#0369a1" },
  { left: "48%", delay: "0.18s", color: "#be123c" },
  { left: "70%", delay: "0.28s", color: "#7c3aed" },
  { left: "92%", delay: "0.12s", color: "#0070ba" },
];

type SettledScreenProps = {
  receipt: Receipt;
  shares: PersonShare[];
  payments: PaymentRecord[];
  onReset: () => void;
};

export function SettledScreen({ receipt, shares, payments, onReset }: SettledScreenProps) {
  return (
    <section className="relative space-y-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {pieces.map((piece) => (
          <span
            key={`${piece.left}-${piece.delay}`}
            className="confetti-piece"
            style={{ left: piece.left, animationDelay: piece.delay, backgroundColor: piece.color }}
          />
        ))}
      </div>

      <div className="rounded-3xl bg-white px-5 py-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Everyone is square</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Bill settled 🎉</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {receipt.restaurant} is paid in full. {formatMoney(toCents(receipt.total), receipt.currency)} landed across{" "}
          {shares.length} people.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-base font-semibold text-slate-900">Receipt</h3>
        <ul className="mt-3 space-y-2">
          {receipt.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-slate-700">
                {item.name}
                {item.qty > 1 ? ` × ${item.qty}` : ""}
              </span>
              <span className="font-medium text-slate-900">{formatMoney(lineCents(item), receipt.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>Subtotal</dt>
            <dd>{formatMoney(toCents(receipt.subtotal), receipt.currency)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Tax</dt>
            <dd>{formatMoney(toCents(receipt.tax), receipt.currency)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Tip</dt>
            <dd>{formatMoney(toCents(receipt.tip), receipt.currency)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold text-slate-900">
            <dt>Total</dt>
            <dd>{formatMoney(toCents(receipt.total), receipt.currency)}</dd>
          </div>
        </dl>
      </div>

      <ul className="space-y-3">
        {shares.map((share) => {
          const payment = payments.find((entry) => entry.personId === share.personId);
          return (
            <li key={share.personId} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{share.name}</p>
                <p className="font-semibold text-slate-900">{formatMoney(share.totalCents, receipt.currency)}</p>
              </div>
              <p className="mt-1 text-sm text-emerald-800">{share.totalCents > 0 ? "Paid ✅" : "Nothing owed"}</p>
              {payment ? <p className="mt-1 font-mono text-xs text-slate-500">PayPal order {payment.orderId}</p> : null}
              {share.items.length > 0 ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {share.items
                    .map((item) =>
                      item.sharedWith > 1 ? `${item.name} (shared)` : item.name,
                    )
                    .join(", ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onReset}
        className="h-12 w-full rounded-2xl bg-accent text-base font-semibold text-white hover:bg-accent-dark"
      >
        Start new bill
      </button>
    </section>
  );
}
