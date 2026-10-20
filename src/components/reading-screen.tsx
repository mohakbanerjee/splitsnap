"use client";

import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";

export function ReadingScreen() {
  return (
    <section className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200" aria-live="polite">
      <div className="relative mx-auto h-40 w-32 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
        <ReceiptText className="absolute top-6 left-1/2 h-10 w-10 -translate-x-1/2 text-slate-300" aria-hidden />
        <motion.div
          className="absolute right-3 left-3 h-1 rounded-full bg-accent shadow-[0_0_12px_rgba(0,112,186,0.65)]"
          animate={{ top: ["18%", "78%", "18%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-slate-900">Reading your receipt…</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Gemini is picking out the restaurant, each dish, tax, and tip.
      </p>
    </section>
  );
}
