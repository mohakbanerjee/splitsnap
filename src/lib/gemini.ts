import { GoogleGenAI, type Part } from "@google/genai";

const MODEL = "gemini-3.8-flash";

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return new GoogleGenAI({ apiKey });
}

export async function generateText(parts: Part[], json: boolean): Promise<string> {
  const response = await client().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      temperature: json ? 0 : 0.4,
      responseMimeType: json ? "application/json" : "text/plain",
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: json ? 2000 : 400,
      abortSignal: AbortSignal.timeout(25_000),
    },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("The model returned an empty response.");
  return text;
}
