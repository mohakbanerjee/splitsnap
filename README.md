# SplitSnap

Snap a restaurant receipt, let Gemini read it, and have everyone pay their exact share with PayPal.

Splitting a dinner bill usually means guessing who had the salad, arguing about shared plates, and then chasing people for tax and tip. The math is small, but the rounding is where it gets unfair, and the payment step is a separate conversation. SplitSnap keeps the whole thing in one flow: a photo of the bill becomes an editable check, each person is assigned the dishes they ate, and PayPal collects that person's share.

## How it works

1. Upload a receipt photo, or try the built-in sample from Bella Cucina. On a phone, the upload control can open the camera.
2. Gemini reads the restaurant, line items, tax, and tip. You can correct anything before anyone pays.
3. Add the people at the table and tap to assign each dish. A dish can belong to several people and is split evenly between them. Anything still unassigned is highlighted.
4. Tax and tip are split in proportion to each person's food subtotal. Amounts are calculated in cents, and leftover cents go to the largest share, so the individual totals add up to the receipt total exactly.
5. Each person gets their own PayPal button for their amount. When a sandbox payment is captured, that person is marked paid. After everyone has paid, SplitSnap shows the settled bill.

The sample receipt always works for a demo. The app sends `public/sample-receipt.png` through the parser, and if that call fails it uses a pre-parsed copy of the same bill.

The whole session is stored in `localStorage`. Refreshing the page keeps the bill, the assignments, and who has paid. **Start new bill** clears it.

## How Gemini is used

Gemini (`gemini-3.8-flash`, via `@google/genai`) does two jobs. `gemini-2.5-flash` is no longer available to new API keys, so SplitSnap uses the current flash model Google recommends:

- **Receipt parsing** (`POST /api/parse`). The photo is sent to the model with a prompt that requires strict JSON: restaurant, currency, items (`id`, `name`, `price`, `qty`), subtotal, tax, tip, and total. The response is validated. If the JSON is unusable, SplitSnap retries once. The unit price and quantity stay editable after that.
- **Split explanation** (`POST /api/explain`). After items are assigned, **Explain the split** asks Gemini for a short, friendly breakdown of who owes what and why, including shared dishes. If the model cannot answer, the app shows a summary calculated from the same split so the demo can continue.

The API key stays on the server.

## How PayPal is used

PayPal is the checkout, not a side link. Each person pays only their share through the PayPal JavaScript SDK (`@paypal/react-paypal-js`) in **sandbox** mode, with `currency` set to `USD` and `intent` set to `capture`.

The browser never sees the PayPal secret.

- `POST /api/paypal/create-order` requests an access token from `https://api-m.sandbox.paypal.com/v1/oauth2/token`, then creates an Orders v2 order. The description includes the person's name and the restaurant.
- `POST /api/paypal/capture-order` captures that order after the buyer approves it in the PayPal window.

A captured payment is marked **Paid** with the PayPal order id. A progress line shows how many people are done, for example `3 of 4 paid`. When the last share is captured, the bill-settled screen lists the receipt and every order id. Cancelling or failing a payment leaves that person unpaid and shows a message so they can try again.

## Tech stack

- Next.js (App Router, TypeScript, `src/`)
- Tailwind CSS
- `@google/genai`
- `@paypal/react-paypal-js`
- `lucide-react`
- `framer-motion`

## Setup

```bash
npm install
copy .env.example .env.local
```

On macOS or Linux, use `cp .env.example .env.local`. Fill in the three values in `.env.local`, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Set these in `.env.local` for local development, and in the host's environment for deployment. Names only:

| Name | Where it is used |
| --- | --- |
| `GEMINI_API_KEY` | Server only. Receipt parsing and the split explanation. |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Browser and server. Loads the PayPal SDK and requests the sandbox access token. |
| `PAYPAL_CLIENT_SECRET` | Server only. Never expose this to the client. |

`.env.local` is gitignored. `.env.example` lists the names with empty values.

## Test with a PayPal sandbox buyer

1. Open the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/accounts) and use the sandbox app that matches `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
2. Open a **Personal** sandbox account and note its email and password. This is the buyer. No real money moves.
3. In SplitSnap, run the sample receipt, assign every item, and continue to pay.
4. On a person's card, click the PayPal button. If the window does not open, allow popups for the site.
5. Log in with the sandbox buyer and approve the payment.
6. That person should show **Paid** and a PayPal order id. Repeat for anyone else who owes money. The settled screen appears when every share is captured.

You can also edit prices, quantities, tax, and the tip shortcuts (0, 10, 15, 18, 20) before anyone pays. After the first capture, the split locks so later edits cannot change an amount that was already charged. Start a new bill to begin again.

## Scripts

```bash
npm run dev
npm run build
npm run lint
node scripts/generate-sample-receipt.mjs
```

The last command redraws `public/sample-receipt.png` from the Bella Cucina sample.
