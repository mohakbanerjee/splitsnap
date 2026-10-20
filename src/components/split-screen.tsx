"use client";

import { formatMoney, toCents } from "@/lib/money";
import { lineCents } from "@/lib/receipt";
import type { ExplainPayload } from "@/lib/split";
import type { Person, Receipt, SplitResult } from "@/lib/types";
import { AlertTriangle, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

type SplitScreenProps = {
  receipt: Receipt;
  people: Person[];
  result: SplitResult;
  explanation: string | null;
  explanationSource: "ai" | "fallback" | null;
  locked: boolean;
  onRename: (id: string, name: string) => void;
  onAddPerson: (name: string) => void;
  onRemovePerson: (id: string) => void;
  onToggle: (itemId: string, personId: string) => void;
  onExplain: (payload: ExplainPayload) => Promise<void>;
  explainPayload: ExplainPayload;
  onBack: () => void;
  onContinue: () => void;
};

export function SplitScreen({
  receipt,
  people,
  result,
  explanation,
  explanationSource,
  locked,
  onRename,
  onAddPerson,
  onRemovePerson,
  onToggle,
  onExplain,
  explainPayload,
  onBack,
  onContinue,
}: SplitScreenProps) {
  const [draft, setDraft] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const unassigned = new Set(result.unassignedItemIds);
  const canPay = result.unassignedItemIds.length === 0 && result.isBalanced && people.length >= 2;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">People</h2>
        <p className="mt-1 text-sm text-slate-600">At least two. Tap a name to edit it.</p>
        <ul className="mt-3 space-y-2">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-2">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg"
                style={{ backgroundColor: `${person.color}22`, borderColor: person.color }}
                aria-hidden
              >
                {person.emoji}
              </span>
              <input
                aria-label={`Name for ${person.name}`}
                value={person.name}
                maxLength={24}
                disabled={locked}
                onChange={(event) => onRename(person.id, event.target.value)}
                onBlur={() => {
                  if (!person.name.trim()) onRename(person.id, "Friend");
                }}
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 disabled:bg-slate-100"
              />
              <button
                type="button"
                aria-label={`Remove ${person.name}`}
                disabled={locked || people.length <= 2}
                onClick={() => onRemovePerson(person.id)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-rose-700 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = draft.trim();
            if (!name || people.length >= 12) return;
            onAddPerson(name);
            setDraft("");
          }}
        >
          <input
            aria-label="New person name"
            value={draft}
            maxLength={24}
            disabled={locked || people.length >= 12}
            placeholder="Add a name"
            onChange={(event) => setDraft(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/20 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={locked || !draft.trim() || people.length >= 12}
            className="flex h-11 items-center gap-1 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </button>
        </form>
      </div>

      {unassigned.size > 0 ? (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {unassigned.size === 1 ? "1 item still needs a person." : `${unassigned.size} items still need a person.`}
        </p>
      ) : null}

      <ul className="space-y-3">
        {receipt.items.map((item) => {
          const needsPerson = unassigned.has(item.id);
          return (
            <li
              key={item.id}
              className={`rounded-3xl p-4 shadow-sm ring-1 ${needsPerson ? "bg-amber-50 ring-amber-300" : "bg-white ring-slate-200"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{item.name}</h3>
                  <p className="text-sm text-slate-600">
                    {item.qty} × {formatMoney(toCents(item.price), receipt.currency)}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">
                  {formatMoney(lineCents(item), receipt.currency)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {people.map((person) => {
                  const isOn = result.shares.some(
                    (share) => share.personId === person.id && share.items.some((entry) => entry.itemId === item.id),
                  );
                  return (
                    <button
                      key={person.id}
                      type="button"
                      aria-pressed={isOn}
                      disabled={locked}
                      onClick={() => onToggle(item.id, person.id)}
                      className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${isOn ? "text-white" : "bg-slate-100 text-slate-800"}`}
                      style={isOn ? { backgroundColor: person.color } : undefined}
                    >
                      <span aria-hidden>{person.emoji}</span>
                      {person.name}
                    </button>
                  );
                })}
              </div>
              {needsPerson ? <p className="mt-2 text-sm font-medium text-amber-900">Unassigned</p> : null}
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {result.shares.map((share) => {
          const person = people.find((entry) => entry.id === share.personId);
          return (
            <article key={share.personId} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {person?.emoji}
                </span>
                <h3 className="font-semibold text-slate-900">{share.name}</h3>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {formatMoney(share.totalCents, receipt.currency)}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Food {formatMoney(share.subtotalCents, receipt.currency)} · Tax{" "}
                {formatMoney(share.taxCents, receipt.currency)} · Tip {formatMoney(share.tipCents, receipt.currency)}
              </p>
            </article>
          );
        })}
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <button
          type="button"
          disabled={explaining || result.unassignedItemIds.length > 0}
          onClick={() => {
            setExplainError(null);
            setExplaining(true);
            void onExplain(explainPayload)
              .catch((error: unknown) => {
                setExplainError(error instanceof Error ? error.message : "Could not explain the split.");
              })
              .finally(() => setExplaining(false));
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          {explaining ? "Writing the breakdown…" : "Explain the split ✨"}
        </button>
        {result.unassignedItemIds.length > 0 ? (
          <p className="mt-2 text-sm text-slate-500">Assign every item first so the explanation matches the bill.</p>
        ) : null}
        {explainError ? (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            {explainError}
          </p>
        ) : null}
        {explanation ? (
          <div className="mt-4 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
            <p className="text-sm font-semibold text-accent-dark">Why this split</p>
            <p className="mt-2 text-sm leading-6 text-slate-800">{explanation}</p>
            {explanationSource === "fallback" ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Gemini was unavailable, so this summary was calculated from the split.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={locked}
          className="h-12 flex-1 rounded-2xl bg-white text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canPay}
          className="h-12 flex-[2] rounded-2xl bg-accent text-base font-semibold text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pay with PayPal
        </button>
      </div>
    </section>
  );
}
