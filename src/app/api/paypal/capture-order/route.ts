import { paypalRequest } from "@/lib/paypal";
import { NextResponse } from "next/server";

type CaptureResponse = {
  id?: string;
  status?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { orderId?: unknown };
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!/^[A-Z0-9]+$/.test(orderId)) {
      return NextResponse.json({ error: "That PayPal order could not be found." }, { status: 400 });
    }

    const capture = await paypalRequest<CaptureResponse>(
      `/v2/checkout/orders/${orderId}/capture`,
      { method: "POST" },
    );
    if (capture.status !== "COMPLETED" || !capture.id) {
      return NextResponse.json(
        { error: "PayPal has not completed this payment yet. You can try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ id: capture.id, status: capture.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not capture the PayPal payment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
