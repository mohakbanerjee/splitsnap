import type { Person } from "@/lib/types";

export const PERSON_COLORS = [
  "#0070ba",
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#0369a1",
] as const;

export const PERSON_EMOJIS = ["🦊", "🐼", "🐸", "🦉", "🐧", "🦋"] as const;

export function createPerson(name: string, index: number, id?: string): Person {
  return {
    id: id ?? crypto.randomUUID(),
    name: name.trim().slice(0, 24),
    emoji: PERSON_EMOJIS[index % PERSON_EMOJIS.length],
    color: PERSON_COLORS[index % PERSON_COLORS.length],
  };
}

export function defaultPeople(): Person[] {
  return [createPerson("Alex", 0), createPerson("Sam", 1)];
}
