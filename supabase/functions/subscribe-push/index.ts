import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface PushSubscriptionInput {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
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

  const userId = await getUserId(req);
  if (!userId) return jsonResponse({ error: "Login erforderlich." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Supabase nicht konfiguriert." }, 500);
  }

  let input: PushSubscriptionInput;
  try {
    input = (await req.json()) as PushSubscriptionInput;
  } catch {
    return jsonResponse({ error: "Ungültiger JSON-Body." }, 400);
  }

  if (!input.endpoint) {
    return jsonResponse({ error: "Endpoint fehlt." }, 400);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client = createClient(
    supabaseUrl,
    serviceRoleKey ?? supabaseAnonKey,
    { auth: { persistSession: false } }
  );

  const { error } = await client
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: input.endpoint,
        p256dh: input.keys?.p256dh ?? null,
        auth: input.keys?.auth ?? null,
        content_encoding: "aes128gcm"
      },
      { onConflict: "user_id, endpoint" }
    );

  if (error) {
    return jsonResponse({ error: `Speichern fehlgeschlagen: ${error.message}` }, 500);
  }

  return jsonResponse({ success: true });
});
