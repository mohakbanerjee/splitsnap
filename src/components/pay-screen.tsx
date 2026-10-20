"use client";

import { formatMoney } from "@/lib/money";
import type { PaymentRecord, Person, PersonShare, Receipt } from "@/lib/types";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Component, type ReactNode, useRef, useState, useSyncExternalStore } from "react";

type PayScreenProps = {
  receipt: Receipt;
  people: Person[];
  shares: PersonShare[];
  payments: PaymentRecord[];
  onPaid: (personId: string, orderId: string) => void;
  onBack: () => void;
  canGoBack: boolean;
};

function subscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

class PayPalBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <p className="text-sm text-rose-700">PayPal could not load. Refresh the page and try again.</p>;
    }
    return this.props.children;
  }
}

function isSettled(share: PersonShare, payments: PaymentRecord[]) {
  return share.totalCents <= 0 || payments.some((payment) => payment.personId === share.personId);
}

export function PayScreen({ receipt, people, shares, payments, onPaid, onBack, canGoBack }: PayScreenProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
  const ready = useIsClient();
  const settled = shares.filter((share) => isSettled(share, payments)).length;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{receipt.restaurant}</h2>
            <p className="text-sm text-slate-600">Each person pays their own share in the PayPal sandbox.</p>
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {settled} of {shares.length} paid
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={settled}
          aria-valuemin={0}
          aria-valuemax={shares.length}
          aria-label={`${settled} of ${shares.length} paid`}
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${shares.length === 0 ? 0 : (settled / shares.length) * 100}%` }}
          />
        </div>
        {receipt.currency !== "USD" ? (
          <p className="mt-3 text-sm text-slate-600">
            This receipt is in {receipt.currency}. Sandbox checkout charges those same amounts in USD.
          </p>
        ) : null}
      </div>

      {!clientId ? (
        <p role="alert" className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          PayPal is not configured. Add the client id to the environment and reload.
        </p>
      ) : null}

      {ready && clientId ? (
        <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture", environment: "sandbox" }}>
          <div className="space-y-3">
            {shares.map((share) => {
              const person = people.find((entry) => entry.id === share.personId);
              const payment = payments.find((entry) => entry.personId === share.personId);
              return (
                <PayPalBoundary key={share.personId}>
                  <PersonCard
                    share={share}
                    emoji={person?.emoji ?? "🙂"}
                    color={person?.color ?? "#0070ba"}
                    currency={receipt.currency}
                    restaurant={receipt.restaurant}
                    payment={payment}
                    onPaid={onPaid}
                  />
                </PayPalBoundary>
              );
            })}
          </div>
        </PayPalScriptProvider>
      ) : (
        <div className="space-y-3">
          {shares.map((share) => (
            <article key={share.personId} className="h-36 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="h-12 w-full rounded-2xl bg-white text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"
      >
        Back to split
      </button>
    </section>
  );
}

function PersonCard({
  share,
  emoji,
  color,
  currency,
  restaurant,
  payment,
  onPaid,
}: {
  share: PersonShare;
  emoji: string;
  color: string;
  currency: string;
  restaurant: string;
  payment?: PaymentRecord;
  onPaid: (personId: string, orderId: string) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const notice = useRef<string | null>(null);
  const owed = share.totalCents > 0;
  const paid = Boolean(payment);

  function show(next: string | null) {
    notice.current = next;
    setMessage(next);
  }

  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg"
            style={{ backgroundColor: `${color}22`, borderColor: color }}
            aria-hidden
          >
            {emoji}
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">{share.name}</h3>
            <p className="text-sm text-slate-600">
              Food {formatMoney(share.subtotalCents, currency)} · Tax {formatMoney(share.taxCents, currency)} · Tip{" "}
              {formatMoney(share.tipCents, currency)}
            </p>
          </div>
        </div>
        <p className="text-xl font-semibold text-slate-900">{formatMoney(share.totalCents, currency)}</p>
      </div>

      <div className="mt-4">
        {paid ? (
          <div>
            <p className="text-base font-semibold text-emerald-800">Paid ✅</p>
            <p className="mt-1 font-mono text-xs text-slate-500">PayPal order {payment?.orderId}</p>
          </div>
        ) : !owed ? (
          <p className="text-sm font-semibold text-emerald-800">Nothing owed</p>
        ) : (
          <PayPalButtons
            style={{ layout: "vertical", shape: "rect", label: "paypal", height: 45 }}
            forceReRender={[share.totalCents, share.name]}
            createOrder={async () => {
              show(null);
              const response = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: (share.totalCents / 100).toFixed(2),
                  personName: share.name,
                  restaurant,
                }),
              });
              const data = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
              if (!response.ok || !data?.id) {
                const error = data?.error || "Could not start PayPal checkout.";
                show(error);
                throw new Error(error);
              }
              return data.id;
            }}
            onApprove={async (data) => {
              const response = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID }),
              });
              const payload = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
              if (!response.ok || !payload?.id) {
                show(payload?.error || "PayPal approved the payment, but the capture did not finish.");
                return;
              }
              show(null);
              onPaid(share.personId, payload.id);
            }}
            onCancel={() => show("Payment cancelled. You can try again when you're ready.")}
            onError={() => {
              if (!notice.current) show("PayPal couldn't complete the payment. Please try again.");
            }}
          />
        )}
        {message ? (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {message}
          </p>
        ) : null}
      </div>
    </article>
  );
}
