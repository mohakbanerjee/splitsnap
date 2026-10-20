import { paypalRequest } from "@/lib/paypal";
import { NextResponse } from "next/server";

type CreateBody = {
  amount?: unknown;
  personName?: unknown;
  restaurant?: unknown;
};

function moneyValue(value: unknown): string | null {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return null;
  return amount.toFixed(2);
}

function clip(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 60) : fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBody;
    const amount = moneyValue(body.amount);
    if (!amount) {
      return NextResponse.json({ error: "Enter a valid amount before paying." }, { status: 400 });
    }
    const personName = clip(body.personName, "Guest");
    const restaurant = clip(body.restaurant, "the restaurant");
    const description = `${personName}'s share at ${restaurant}`.slice(0, 127);

    const order = await paypalRequest<{ id?: string }>("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description,
            custom_id: personName.slice(0, 127),
            amount: { currency_code: "USD", value: amount },
          },
        ],
      }),
    });

    if (!order.id) throw new Error("PayPal did not return an order id.");
    return NextResponse.json({ id: order.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start PayPal checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
