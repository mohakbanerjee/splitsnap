import { isTipPercent } from "@/lib/money";
import { defaultPeople } from "@/lib/people";
import { normalizeReceipt } from "@/lib/receipt";
import type { PaymentRecord, Person, SessionState, Step } from "@/lib/types";

const STORAGE_KEY = "splitsnap.session.v1";
const STEPS: Step[] = ["landing", "reading", "review", "split", "pay", "done"];

export function createInitialSession(): SessionState {
  return {
    step: "landing",
    receipt: null,
    people: defaultPeople(),
    assignments: {},
    payments: [],
    explanation: null,
    explanationSource: null,
    tipPercent: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function sanitizePeople(value: unknown): Person[] {
  if (!Array.isArray(value)) return defaultPeople();
  const people: Person[] = [];
  const used = new Set<string>();
  for (const entry of value.slice(0, 12)) {
    if (!isRecord(entry) || typeof entry.name !== "string" || typeof entry.id !== "string") continue;
    const name = entry.name.trim().slice(0, 24);
    if (!name || used.has(entry.id)) continue;
    used.add(entry.id);
    people.push({
      id: entry.id,
      name,
      emoji: typeof entry.emoji === "string" && entry.emoji ? entry.emoji.slice(0, 8) : "🙂",
      color:
        typeof entry.color === "string" && /^#[0-9a-fA-F]{6}$/.test(entry.color)
          ? entry.color
          : "#0070ba",
    });
  }
  return people.length >= 2 ? people : defaultPeople();
}

function sanitizePayments(value: unknown, people: Person[]): PaymentRecord[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set(people.map((person) => person.id));
  const payments: PaymentRecord[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.personId !== "string" || typeof entry.orderId !== "string") {
      continue;
    }
    if (!ids.has(entry.personId) || !/^[A-Za-z0-9]+$/.test(entry.orderId)) continue;
    payments.push({ personId: entry.personId, orderId: entry.orderId.slice(0, 40) });
  }
  return payments;
}

export function sanitizeSession(value: unknown): SessionState | null {
  if (!isRecord(value) || typeof value.step !== "string" || !STEPS.includes(value.step as Step)) {
    return null;
  }
  let step = value.step as Step;
  if (step === "reading") step = "landing";

  let receipt = null;
  if (value.receipt) {
    try {
      receipt = normalizeReceipt(value.receipt);
    } catch {
      receipt = null;
      step = "landing";
    }
  }
  if (!receipt && step !== "landing") step = "landing";

  const people = sanitizePeople(value.people);
  const personIds = new Set(people.map((person) => person.id));
  const itemIds = new Set(receipt?.items.map((item) => item.id) ?? []);
  const assignments: Record<string, string[]> = {};
  if (isRecord(value.assignments)) {
    for (const [itemId, assigned] of Object.entries(value.assignments)) {
      if (!itemIds.has(itemId) || !Array.isArray(assigned)) continue;
      const ids = assigned.filter((id): id is string => typeof id === "string" && personIds.has(id));
      if (ids.length > 0) assignments[itemId] = [...new Set(ids)];
    }
  }

  const explanation =
    typeof value.explanation === "string" ? value.explanation.trim().slice(0, 900) : null;
  const explanationSource =
    value.explanationSource === "ai" || value.explanationSource === "fallback"
      ? value.explanationSource
      : null;

  return {
    step,
    receipt,
    people,
    assignments,
    payments: sanitizePayments(value.payments, people),
    explanation: explanation || null,
    explanationSource: explanation ? explanationSource : null,
    tipPercent: typeof value.tipPercent === "number" && isTipPercent(value.tipPercent) ? value.tipPercent : null,
  };
}

export function loadSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState): void {
  if (typeof window === "undefined" || session.step === "reading") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

const listeners = new Set<() => void>();
let clientSnapshot: SessionState | null = null;

function remember(next: SessionState) {
  clientSnapshot = next;
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    clientSnapshot = loadSession() ?? createInitialSession();
    listeners.forEach((storedListener) => storedListener());
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getClientSession(): SessionState {
  if (!clientSnapshot) clientSnapshot = loadSession() ?? createInitialSession();
  return clientSnapshot;
}

export function getServerSession(): SessionState | null {
  return null;
}

export function setClientSession(next: SessionState): void {
  saveSession(next);
  remember(next);
}
