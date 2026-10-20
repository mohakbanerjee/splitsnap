import { generateText } from "@/lib/gemini";
import { explainLocally, type ExplainPayload } from "@/lib/split";
import { NextResponse } from "next/server";

function isPayload(value: unknown): value is ExplainPayload {
  if (!value || typeof value !== "object") return false;
  const data = value as ExplainPayload;
  return (
    typeof data.restaurant === "string" &&
    typeof data.receiptTotal === "string" &&
    Array.isArray(data.people) &&
    data.people.length >= 2 &&
    data.people.every(
      (person) =>
        person &&
        typeof person.name === "string" &&
        typeof person.total === "string" &&
        Array.isArray(person.items),
    )
  );
}

function tidy(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 900) return clean;
  const clipped = clean.slice(0, 900);
  const period = clipped.lastIndexOf(".");
  return period > 200 ? clipped.slice(0, period + 1) : clipped;
}

async function explainWithGemini(payload: ExplainPayload): Promise<string> {
  const text = await generateText(
    [
      {
        text: `You explain a shared restaurant bill in a warm, concise way.
Write 2 to 4 sentences of plain prose.
Say who owes what, using the exact dollar amounts provided.
Mention shared items by name and who shared them.
Do not use markdown, bullets, or headings.
Do not invent items or change any amount.

Bill JSON:
${JSON.stringify(payload)}`,
      },
    ],
    false,
  );
  const explanation = tidy(text);
  if (!explanation) throw new Error("Empty explanation.");
  return explanation;
}

export async function POST(request: Request) {
  let payload: ExplainPayload;
  try {
    const body: unknown = await request.json();
    if (!isPayload(body)) {
      return NextResponse.json({ error: "The split details were incomplete." }, { status: 400 });
    }
    payload = body;
  } catch {
    return NextResponse.json({ error: "The split details were incomplete." }, { status: 400 });
  }

  try {
    const explanation = await explainWithGemini(payload);
    return NextResponse.json({ explanation, source: "ai" });
  } catch {
    try {
      const explanation = await explainWithGemini(payload);
      return NextResponse.json({ explanation, source: "ai" });
    } catch {
      return NextResponse.json({
        explanation: explainLocally(payload),
        source: "fallback",
      });
    }
  }
}
