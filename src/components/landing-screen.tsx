"use client";

import { Camera, Images, Upload, Users, Wallet } from "lucide-react";
import { useRef, useState } from "react";

const steps = [
  {
    icon: Camera,
    title: "Snap the receipt",
    copy: "Take a photo or upload the bill. Gemini reads every line.",
  },
  {
    icon: Users,
    title: "Split it fairly",
    copy: "Assign dishes, including the ones you shared. Tax and tip follow the food.",
  },
  {
    icon: Wallet,
    title: "Pay in one tap",
    copy: "Each person checks out their exact share with PayPal.",
  },
];

type LandingScreenProps = {
  error: string | null;
  canResume: boolean;
  onFile: (file: File) => void;
  onSample: () => void;
  onResume: () => void;
};

export function LandingScreen({ error, canResume, onFile, onSample, onResume }: LandingScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function takeFile(file: File | undefined) {
    if (file) onFile(file);
  }

  return (
    <div className="space-y-5">
      <section
        className={`relative overflow-hidden rounded-3xl bg-white px-5 py-7 shadow-sm ring-1 ${dragging ? "ring-accent" : "ring-slate-200"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          takeFile(event.dataTransfer.files?.[0]);
        }}
      >
        <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-accent/10" aria-hidden />
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">PayPal AI Hackathon</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">SplitSnap</h1>
        <p className="mt-3 max-w-sm text-lg leading-7 text-slate-600">
          Snap the bill. Split it fairly. Pay in one tap.
        </p>
        <div className="mt-6 space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              takeFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-base font-semibold text-white transition hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Upload className="h-5 w-5" aria-hidden />
            Upload receipt
          </button>
          <button
            type="button"
            onClick={onSample}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-base font-semibold text-slate-900 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Images className="h-5 w-5" aria-hidden />
            Try a sample receipt
          </button>
          {canResume ? (
            <button
              type="button"
              onClick={onResume}
              className="h-11 w-full rounded-2xl text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Continue your bill
            </button>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            {error}
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Phone camera or a photo from your library both work. You can also drop an image here.</p>
        )}
      </section>

      <section aria-labelledby="how-it-works" className="space-y-3">
        <h2 id="how-it-works" className="px-1 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          How it works
        </h2>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <step.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-500">Step {index + 1}</span>
                <span className="block text-base font-semibold text-slate-900">{step.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{step.copy}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
