import { generateText } from "@/lib/gemini";
import { extractJson, normalizeReceipt } from "@/lib/receipt";
import { NextResponse } from "next/server";

const PARSE_PROMPT = `You extract structured data from a photo of a restaurant receipt.
Return only JSON with this shape and no markdown:
{
  "restaurant": string,
  "currency": string,
  "items": [{ "id": string, "name": string, "price": number, "qty": number }],
  "subtotal": number,
  "tax": number,
  "tip": number,
  "total": number
}
Rules:
- price is the unit price, not the line total.
- qty is a whole number. Use 1 when the receipt does not show a quantity.
- If a line shows a quantity and a line total, convert it back to unit price and qty.
- tax is sales tax. Use 0 if it is not printed.
- tip is tip or gratuity. Use 0 if it is not printed.
- currency is an ISO code such as USD.
- id values are short and unique, like item-1.
- Every number must be a JSON number, not a string.`;

const MAX_BYTES = 8 * 1024 * 1024;

function sniffMime(bytes: Uint8Array, reported: string): string {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return reported;
}

function allowed(mime: string): boolean {
  return ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif"].includes(mime);
}

async function readReceipt(mime: string, data: string, correction?: string) {
  const prompt = correction ? `${PARSE_PROMPT}\n\n${correction}` : PARSE_PROMPT;
  const text = await generateText(
    [
      { text: prompt },
      { inlineData: { mimeType: mime, data } },
    ],
    true,
  );
  return normalizeReceipt(extractJson(text));
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Choose a receipt photo to upload." }, { status: 400 });
    }
    if (image.size <= 0 || image.size > MAX_BYTES) {
      return NextResponse.json({ error: "Use a receipt photo smaller than 8 MB." }, { status: 400 });
    }

    const bytes = new Uint8Array(await image.arrayBuffer());
    const mime = sniffMime(bytes, image.type || "image/jpeg");
    if (!allowed(mime)) {
      return NextResponse.json({ error: "Upload a PNG, JPG, WEBP, or GIF receipt." }, { status: 400 });
    }

    const data = Buffer.from(bytes).toString("base64");
    try {
      const receipt = await readReceipt(mime, data);
      return NextResponse.json({ receipt });
    } catch (error) {
      if (error instanceof Error && /not configured/i.test(error.message)) throw error;
      const reason = error instanceof Error ? error.message : "Invalid JSON";
      console.error("SplitSnap parse attempt failed:", reason);
      try {
        const receipt = await readReceipt(
          mime,
          data,
          `The previous response could not be used (${reason.slice(0, 180)}). Return only one valid JSON object matching the schema.`,
        );
        return NextResponse.json({ receipt });
      } catch (retryError) {
        const retryReason = retryError instanceof Error ? retryError.message : "Invalid JSON";
        console.error("SplitSnap parse retry failed:", retryReason);
        throw retryError;
      }
    }
  } catch (error) {
    const message =
      error instanceof Error && /not configured/i.test(error.message)
        ? "The receipt reader is not configured yet."
        : "Could not read that receipt. Try a clearer photo, or use the sample receipt.";
    const status = error instanceof Error && /not configured/i.test(error.message) ? 500 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
