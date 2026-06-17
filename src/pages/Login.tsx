import { useEffect, useState } from "react";
import { Chrome, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { hasGoogleAuthEnv, hasSupabaseEnv } from "../lib/supabase";
import { useAppStore } from "../store/useAppStore";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const login = useAppStore((state) => state.login);
  const syncError = useAppStore((state) => state.syncError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_25%)] px-4">
      <section className="w-full max-w-md rounded-[32px] border border-white/50 bg-white/80 p-8 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Klausurplaner</p>
        <h1 className="mt-3 font-display text-4xl text-slate-950 dark:text-white">Cloud Login</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Offline-first bleibt aktiv. Supabase synchronisiert nur im Hintergrund, sobald du Cloud Sync einschaltest.
        </p>

        {!hasSupabaseEnv ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            Supabase ist noch nicht konfiguriert. Lege zuerst `.env` anhand von `.env.example` an.
          </div>
        ) : null}

        {hasSupabaseEnv && !hasGoogleAuthEnv ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            Google Login ist noch nicht lokal konfiguriert. Setze `VITE_GOOGLE_CLIENT_ID` in `.env` und aktiviere Google
            als Provider in Supabase Auth.
          </div>
        ) : null}

        {syncError ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {syncError}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <button
            disabled={!hasGoogleAuthEnv || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await login("google");
              } finally {
                setSubmitting(false);
              }
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
          >
            <Chrome size={16} />
            Mit Google anmelden
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            try {
              await login("email", email, password);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            E-Mail
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Passwort
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button
            type="submit"
            disabled={!hasSupabaseEnv || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            <Mail size={16} />
            Mit E-Mail anmelden
          </button>
        </form>
      </section>
    </main>
  );
}
