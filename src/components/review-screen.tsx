"use client";

import { MoneyField } from "@/components/money-field";
import { TIP_PERCENTS, formatMoney, toCents, type TipPercent } from "@/lib/money";
import { lineCents } from "@/lib/receipt";
import type { Receipt } from "@/lib/types";
import { Minus, Plus, Trash2 } from "lucide-react";

type ReviewScreenProps = {
  receipt: Receipt;
  tipPercent: TipPercent | null;
  locked: boolean;
  onRestaurant: (name: string) => void;
  onItem: (id: string, patch: { name?: string; priceCents?: number; qty?: number }) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onTax: (cents: number) => void;
  onTip: (cents: number) => void;
  onTipPercent: (percent: TipPercent) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function ReviewScreen({
  receipt,
  tipPercent,
  locked,
  onRestaurant,
  onItem,
  onDelete,
  onAdd,
  onTax,
  onTip,
  onTipPercent,
  onBack,
  onContinue,
}: ReviewScreenProps) {
  const ready =
    receipt.items.length > 0 &&
    receipt.items.every((item) => item.name.trim().length > 0) &&
    toCents(receipt.total) > 0;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label htmlFor="restaurant" className="text-sm font-medium text-slate-700">
          Restaurant
        </label>
        <input
          id="restaurant"
          value={receipt.restaurant}
          disabled={locked}
          maxLength={80}
          onChange={(event) => onRestaurant(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 disabled:bg-slate-100"
        />
        <p className="mt-2 text-sm text-slate-500">{receipt.currency} · edit anything that looks off</p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Items</h2>
        <ul className="space-y-3">
          {receipt.items.map((item) => (
            <li key={item.id} className="rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200">
              <div className="grid grid-cols-[1fr_2.25rem] gap-2">
                <input
                  aria-label={`Name for ${item.name || "item"}`}
                  value={item.name}
                  disabled={locked}
                  maxLength={80}
                  onChange={(event) => onItem(item.id, { name: event.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  aria-label={`Remove ${item.name || "item"}`}
                  disabled={locked}
                  onClick={() => onDelete(item.id)}
                  className="flex h-11 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-rose-700 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_6.75rem_auto] items-center gap-2">
                <MoneyField
                  id={`price-${item.id}`}
                  ariaLabel={`Unit price for ${item.name || "item"}`}
                  cents={toCents(item.price)}
                  disabled={locked}
                  onChange={(cents) => onItem(item.id, { priceCents: cents })}
                />
                <div className="flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white px-1">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.name || "item"}`}
                    disabled={locked || item.qty <= 1}
                    onClick={() => onItem(item.id, { qty: item.qty - 1 })}
                    className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="min-w-6 text-center text-sm font-semibold text-slate-900">{item.qty}</span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.name || "item"}`}
                    disabled={locked || item.qty >= 99}
                    onClick={() => onItem(item.id, { qty: item.qty + 1 })}
                    className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p className="text-right text-sm font-semibold text-slate-800">
                  {formatMoney(lineCents(item), receipt.currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onAdd}
          disabled={locked}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add item
        </button>
      </div>

      <div className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900">{formatMoney(toCents(receipt.subtotal), receipt.currency)}</span>
        </div>
        <MoneyField id="tax" label="Tax" cents={toCents(receipt.tax)} disabled={locked} onChange={onTax} />
        <div>
          <MoneyField id="tip" label="Tip" cents={toCents(receipt.tip)} disabled={locked} onChange={onTip} />
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Tip percentage">
            {TIP_PERCENTS.map((percent) => {
              const selected = tipPercent === percent;
              return (
                <button
                  key={percent}
                  type="button"
                  aria-pressed={selected}
                  disabled={locked}
                  onClick={() => onTipPercent(percent)}
                  className={`h-10 min-w-14 rounded-full px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 ${selected ? "bg-accent text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
                >
                  {percent}%
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-3" aria-live="polite">
          <span className="text-base font-semibold text-slate-900">Total</span>
          <span className="text-2xl font-semibold tracking-tight text-slate-900">
            {formatMoney(toCents(receipt.total), receipt.currency)}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-12 flex-1 rounded-2xl bg-white text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!ready || locked}
          className="h-12 flex-[2] rounded-2xl bg-accent text-base font-semibold text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Split this bill
        </button>
      </div>
      {!ready ? (
        <p className="text-center text-sm text-slate-500">Add at least one named item with a total above zero.</p>
      ) : null}
    </section>
  );
}
