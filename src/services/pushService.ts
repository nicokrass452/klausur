import { supabase, supabaseUrl, supabaseAnonKey, hasSupabaseEnv } from "../lib/supabase";
import { getSupabaseRequestHeaders } from "../lib/supabase";

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!isPushSupported()) return undefined;
  return navigator.serviceWorker.ready;
}

export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null;

  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toArrayBuffer(urlBase64ToUint8Array(VAPID_PUBLIC_KEY))
  });

  await sendSubscriptionToServer(subscription);
  return subscription;
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  if (!hasSupabaseEnv || !supabaseUrl || !supabaseAnonKey) return;

  const accessToken = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;

  await fetch(`${supabaseUrl}/functions/v1/subscribe-push`, {
    method: "POST",
    headers: {
      ...getSupabaseRequestHeaders(accessToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys?.p256dh,
        auth: subscription.toJSON().keys?.auth
      }
    })
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
}

