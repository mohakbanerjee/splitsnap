"use client";

import { dollarsToCents } from "@/lib/money";
import { useEffect, useRef, useState } from "react";

type MoneyFieldProps = {
  id: string;
  label?: string;
  ariaLabel?: string;
  cents: number;
  onChange: (cents: number) => void;
  disabled?: boolean;
};

export function MoneyField({ id, label, ariaLabel, cents, onChange, disabled }: MoneyFieldProps) {
  const [text, setText] = useState(() => (cents / 100).toFixed(2));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText((cents / 100).toFixed(2));
  }, [cents]);

  return (
    <div className="min-w-0">
      {label ? (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          aria-label={label ?? ariaLabel}
          value={text}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            const next = dollarsToCents(text);
            onChange(next);
            setText((next / 100).toFixed(2));
          }}
          onChange={(event) => {
            const value = event.target.value;
            if (/^\d*\.?\d{0,2}$/.test(value)) setText(value);
          }}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-7 text-base text-slate-900 outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 disabled:bg-slate-100"
        />
      </div>
    </div>
  );
}
