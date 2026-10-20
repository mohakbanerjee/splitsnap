"use client";

import { LandingScreen } from "@/components/landing-screen";
import { PayScreen } from "@/components/pay-screen";
import { ReadingScreen } from "@/components/reading-screen";
import { ReviewScreen } from "@/components/review-screen";
import { SettledScreen } from "@/components/settled-screen";
import { SplitScreen } from "@/components/split-screen";
import { fromCents, type TipPercent } from "@/lib/money";
import { createPerson } from "@/lib/people";
import { normalizeReceipt, recalculateReceipt, tipPercentForReceipt } from "@/lib/receipt";
import { SAMPLE_RECEIPT } from "@/lib/sample-receipt";
import { clearSession, createInitialSession, getClientSession, getServerSession, setClientSession, subscribeSession } from "@/lib/session";
import { buildExplainPayload, computeSplit, type ExplainPayload } from "@/lib/split";
import type { Receipt, SessionState, Step } from "@/lib/types";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ReceiptText } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const flowSteps = ["Review", "Split", "Pay"] as const;

function flowIndex(step: Step): number {
  if (step === "review") return 0;
  if (step === "split") return 1;
  if (step === "pay" || step === "done") return 2;
  return -1;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name);
}

async function parseImage(file: File): Promise<Receipt> {
  const body = new FormData();
  body.append("image", file);
  const response = await fetch("/api/parse", { method: "POST", body });
  const data = (await response.json().catch(() => null)) as { receipt?: unknown; error?: string } | null;
  if (!response.ok || !data?.receipt) {
    throw new Error(data?.error || "Could not read that receipt.");
  }
  return normalizeReceipt(data.receipt);
}

export function SplitSnapApp() {
  const session = useSyncExternalStore(subscribeSession, getClientSession, getServerSession);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <div className="min-h-full" />;
  }

  const receipt = session.receipt;
  const result = receipt ? computeSplit(receipt, session.people, session.assignments) : null;
  const locked = session.payments.length > 0;
  const index = flowIndex(session.step);

  function update(patch: Partial<SessionState> | ((current: SessionState) => SessionState)) {
    const current = getClientSession();
    setClientSession(typeof patch === "function" ? patch(current) : { ...current, ...patch });
  }

  function adoptReceipt(next: Receipt) {
    const normalized = normalizeReceipt(next);
    const tipPercent = tipPercentForReceipt(normalized);
    update({
      receipt: recalculateReceipt(normalized, tipPercent),
      tipPercent,
      assignments: {},
      payments: [],
      explanation: null,
      explanationSource: null,
      step: "review",
    });
  }

  async function upload(file: File) {
    if (!isImageFile(file)) {
      setError("Upload a photo of the receipt.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Use a receipt photo smaller than 8 MB.");
      return;
    }
    setError(null);
    update({ step: "reading" });
    try {
      adoptReceipt(await parseImage(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read that receipt.");
      update({ step: "landing" });
    }
  }

  async function loadSample() {
    setError(null);
    update({ step: "reading" });
    try {
      const response = await fetch("/sample-receipt.png");
      if (!response.ok) throw new Error("Sample image missing.");
      const blob = await response.blob();
      const file = new File([blob], "sample-receipt.png", { type: blob.type || "image/png" });
      adoptReceipt(await parseImage(file));
    } catch {
      adoptReceipt(SAMPLE_RECEIPT);
    }
  }

  function startOver(force = false) {
    const current = getClientSession();
    const dirty = current.payments.length > 0 || current.step === "done";
    if (!force && dirty && !window.confirm("Start a new bill? This clears the current split on this device.")) {
      return;
    }
    clearSession();
    setError(null);
    setClientSession(createInitialSession());
  }

  function editReceipt(recipe: (current: Receipt) => { receipt: Receipt; tipPercent: TipPercent | null }) {
    update((current) => {
      if (!current.receipt || current.payments.length > 0) return current;
      const next = recipe(current.receipt);
      return {
        ...current,
        receipt: next.receipt,
        tipPercent: next.tipPercent,
        explanation: null,
        explanationSource: null,
      };
    });
  }

  async function explain(payload: ExplainPayload) {
    const response = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as {
      explanation?: string;
      source?: string;
      error?: string;
    } | null;
    if (!response.ok || !data?.explanation) {
      throw new Error(data?.error || "Could not explain the split.");
    }
    update({
      explanation: data.explanation,
      explanationSource: data.source === "fallback" ? "fallback" : "ai",
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pt-5 pb-12">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white">
              <ReceiptText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-base leading-none font-semibold text-slate-900">SplitSnap</p>
              <p className="mt-1 text-xs text-slate-500">Fair splits, PayPal checkout</p>
            </div>
          </div>
          {session.step !== "reading" && (session.step !== "landing" || receipt) ? (
            <button
              type="button"
              onClick={() => startOver(false)}
              className="rounded-full px-3 py-2 text-sm font-semibold text-accent hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start new bill
            </button>
          ) : null}
        </header>

        {index >= 0 ? (
          <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="Progress">
            {flowSteps.map((label, stepIndex) => {
              const active = stepIndex === index;
              const complete = stepIndex < index || session.step === "done";
              return (
                <li
                  key={label}
                  className={`rounded-full px-2 py-1 text-center text-xs font-semibold ${active ? "bg-accent text-white" : complete ? "bg-accent/10 text-accent-dark" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
                  aria-current={active ? "step" : undefined}
                >
                  {label}
                </li>
              );
            })}
          </ol>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={session.step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {session.step === "landing" ? (
              <LandingScreen
                error={error}
                canResume={Boolean(receipt)}
                onFile={(file) => void upload(file)}
                onSample={() => void loadSample()}
                onResume={() => update({ step: receipt ? "review" : "landing" })}
              />
            ) : null}

            {session.step === "reading" ? <ReadingScreen /> : null}

            {session.step === "review" && receipt ? (
              <ReviewScreen
                receipt={receipt}
                tipPercent={session.tipPercent}
                locked={locked}
                onRestaurant={(name) =>
                  editReceipt((current) => ({
                    receipt: recalculateReceipt({ ...current, restaurant: name }, session.tipPercent),
                    tipPercent: session.tipPercent,
                  }))
                }
                onItem={(id, patch) =>
                  editReceipt((current) => ({
                    receipt: recalculateReceipt(
                      {
                        ...current,
                        items: current.items.map((item) =>
                          item.id === id
                            ? {
                                ...item,
                                name: patch.name ?? item.name,
                                price: patch.priceCents === undefined ? item.price : fromCents(patch.priceCents),
                                qty: patch.qty ?? item.qty,
                              }
                            : item,
                        ),
                      },
                      session.tipPercent,
                    ),
                    tipPercent: session.tipPercent,
                  }))
                }
                onDelete={(id) =>
                  editReceipt((current) => ({
                    receipt: recalculateReceipt(
                      { ...current, items: current.items.filter((item) => item.id !== id) },
                      session.tipPercent,
                    ),
                    tipPercent: session.tipPercent,
                  }))
                }
                onAdd={() =>
                  editReceipt((current) => ({
                    receipt: recalculateReceipt(
                      {
                        ...current,
                        items: [
                          ...current.items,
                          { id: crypto.randomUUID(), name: "New item", price: 0, qty: 1 },
                        ],
                      },
                      session.tipPercent,
                    ),
                    tipPercent: session.tipPercent,
                  }))
                }
                onTax={(cents) =>
                  editReceipt((current) => ({
                    receipt: recalculateReceipt({ ...current, tax: fromCents(cents) }, session.tipPercent),
                    tipPercent: session.tipPercent,
                  }))
                }
                onTip={(cents) =>
                  editReceipt((current) => ({
                    receipt: recalculateReceipt({ ...current, tip: fromCents(cents) }, null),
                    tipPercent: null,
                  }))
                }
                onTipPercent={(percent) =>
                  editReceipt((current) => ({
                    receipt: recalculateReceipt(current, percent),
                    tipPercent: percent,
                  }))
                }
                onBack={() => update({ step: "landing" })}
                onContinue={() => update({ step: "split" })}
              />
            ) : null}

            {session.step === "split" && receipt && result ? (
              <SplitScreen
                receipt={receipt}
                people={session.people}
                result={result}
                explanation={session.explanation}
                explanationSource={session.explanationSource}
                locked={locked}
                explainPayload={buildExplainPayload(receipt, result)}
                onRename={(id, name) =>
                  update((current) => ({
                    ...current,
                    people: current.people.map((person) =>
                      person.id === id ? { ...person, name: name.slice(0, 24) } : person,
                    ),
                    explanation: null,
                    explanationSource: null,
                  }))
                }
                onAddPerson={(name) =>
                  update((current) => ({
                    ...current,
                    people: [...current.people, createPerson(name, current.people.length)],
                    explanation: null,
                    explanationSource: null,
                  }))
                }
                onRemovePerson={(id) =>
                  update((current) => {
                    if (current.people.length <= 2) return current;
                    const assignments = Object.fromEntries(
                      Object.entries(current.assignments).map(([itemId, ids]) => [
                        itemId,
                        ids.filter((personId) => personId !== id),
                      ]),
                    );
                    return {
                      ...current,
                      people: current.people.filter((person) => person.id !== id),
                      assignments,
                      explanation: null,
                      explanationSource: null,
                    };
                  })
                }
                onToggle={(itemId, personId) =>
                  update((current) => {
                    const assigned = current.assignments[itemId] ?? [];
                    const next = assigned.includes(personId)
                      ? assigned.filter((id) => id !== personId)
                      : [...assigned, personId];
                    return {
                      ...current,
                      assignments: { ...current.assignments, [itemId]: next },
                      explanation: null,
                      explanationSource: null,
                    };
                  })
                }
                onExplain={explain}
                onBack={() => update({ step: "review" })}
                onContinue={() => update({ step: "pay" })}
              />
            ) : null}

            {session.step === "pay" && receipt && result ? (
              <PayScreen
                receipt={receipt}
                people={session.people}
                shares={result.shares}
                payments={session.payments}
                canGoBack={!locked}
                onBack={() => update({ step: "split" })}
                onPaid={(personId, orderId) =>
                  update((current) => {
                    if (!current.receipt) return current;
                    const payments = [
                      ...current.payments.filter((payment) => payment.personId !== personId),
                      { personId, orderId },
                    ];
                    const nextResult = computeSplit(current.receipt, current.people, current.assignments);
                    const everyoneSettled = nextResult.shares.every(
                      (share) => share.totalCents <= 0 || payments.some((payment) => payment.personId === share.personId),
                    );
                    return { ...current, payments, step: everyoneSettled ? "done" : "pay" };
                  })
                }
              />
            ) : null}

            {session.step === "done" && receipt && result ? (
              <SettledScreen
                receipt={receipt}
                shares={result.shares}
                payments={session.payments}
                onReset={() => startOver(true)}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
