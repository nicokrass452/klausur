import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface PushPayload {
  userId: string;
  title?: string;
  body?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = [...bytes].map((byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Convert a DER-encoded ECDSA signature to the raw R || S format required by JWT ES256.
 * P-256 signatures are 64 bytes (32 bytes R + 32 bytes S).
 */
function derToRawSignature(der: Uint8Array): Uint8Array {
  let index = 0;
  if (der[index++] !== 0x30) throw new Error("Invalid DER signature");
  const totalLength = der[index++];
  if (totalLength + 2 !== der.length) throw new Error("Invalid DER signature length");

  if (der[index++] !== 0x02) throw new Error("Expected integer for r");
  let rLength = der[index++];
  let r = der.slice(index, index + rLength);
  index += rLength;

  if (der[index++] !== 0x02) throw new Error("Expected integer for s");
  let sLength = der[index++];
  let s = der.slice(index, index + sLength);

  // Drop leading zero byte if present (sign bit handling)
  if (r.length === 33 && r[0] === 0) r = r.slice(1);
  if (s.length === 33 && s[0] === 0) s = s.slice(1);

  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}

async function importVapidPrivateKey(base64urlKey: string): Promise<CryptoKey> {
  const pkcs8 = base64UrlDecode(base64urlKey);
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function createVapidJwt(
  endpoint: string,
  privateKey: CryptoKey,
  publicKeyBase64Url: string
): Promise<string> {
  const endpointUrl = new URL(endpoint);
  const aud = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ aud, exp, sub: "mailto:push@klausurplaner.local" }))
  );
  const signingInput = `${header}.${payload}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const rawSignature = derToRawSignature(new Uint8Array(signature));
  return `${signingInput}.${base64UrlEncode(rawSignature)}`;
}

async function sendPushNotification(
  subscription: {
    endpoint: string;
    p256dh?: string | null;
    auth?: string | null;
  },
  privateKey: CryptoKey,
  publicKeyBase64Url: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const jwt = await createVapidJwt(subscription.endpoint, privateKey, publicKeyBase64Url);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${publicKeyBase64Url}`,
        "Content-Type": "application/octet-stream",
        TTL: "60"
      },
      body: new Uint8Array(0)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      return { success: false, status: response.status, error: text };
    }

    return { success: true, status: response.status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authHeader
    }
  });

  if (!response.ok) return null;
  const user = (await response.json()) as { id: string };
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Nur POST ist erlaubt." }, 405);

  const callingUserId = await getUserId(req);
  if (!callingUserId) return jsonResponse({ error: "Login erforderlich." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Supabase nicht konfiguriert." }, 500);
  }
  if (!vapidPrivateKey || !vapidPublicKey) {
    return jsonResponse({ error: "VAPID_KEYS nicht konfiguriert." }, 500);
  }

  let input: PushPayload;
  try {
    input = (await req.json()) as PushPayload;
  } catch {
    return jsonResponse({ error: "Ungültiger JSON-Body." }, 400);
  }

  // Users may only send pushes to themselves in this MVP.
  const targetUserId = input.userId ?? callingUserId;
  if (targetUserId !== callingUserId) {
    return jsonResponse({ error: "Nicht autorisiert." }, 403);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client = createClient(
    supabaseUrl,
    serviceRoleKey ?? supabaseAnonKey,
    { auth: { persistSession: false } }
  );

  const { data: subscriptions, error } = await client
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", targetUserId);

  if (error) {
    return jsonResponse({ error: `Abfrage fehlgeschlagen: ${error.message}` }, 500);
  }

  if (!subscriptions || subscriptions.length === 0) {
    return jsonResponse({ sent: 0, message: "Keine Push-Subscription vorhanden." });
  }

  const privateKey = await importVapidPrivateKey(vapidPrivateKey);
  const results = await Promise.all(
    subscriptions.map((subscription) =>
      sendPushNotification(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth
        },
        privateKey,
        vapidPublicKey
      )
    )
  );

  const sent = results.filter((result) => result.success).length;
  const failures = results.filter((result) => !result.success);

  return jsonResponse({
    sent,
    total: subscriptions.length,
    failures: failures.length > 0 ? failures : undefined
  });
});
