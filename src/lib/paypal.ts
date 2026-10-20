const SANDBOX = "https://api-m.sandbox.paypal.com";

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function getPayPalAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

  const clientId = requiredEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID");
  const secret = requiredEnv("PAYPAL_CLIENT_SECRET");
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${SANDBOX}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !payload?.access_token) {
    throw new Error("PayPal could not authorize this app. Check the sandbox credentials.");
  }
  tokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 300) * 1000,
  };
  return payload.access_token;
}

export async function paypalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${SANDBOX}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { message?: string; details?: { description?: string }[] })
    | null;
  if (!response.ok) {
    const detail = payload?.details?.[0]?.description || payload?.message;
    throw new Error(detail || "PayPal could not complete that request.");
  }
  return payload as T;
}
