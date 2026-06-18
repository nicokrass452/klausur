import { useEffect, useState } from "react";
import { CalendarDays, Chrome, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.1),_transparent_30%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-6">
        <section className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Klausurplaner</p>
          <h1 className="mt-4 max-w-lg font-display text-5xl leading-tight text-slate-950 dark:text-white">
            Online lernen, Klausuren im Griff behalten.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600 dark:text-slate-300">
            Mit Account nutzt du Cloud-Sync, KI-Coach, automatischen Lernplan und Fortschritt auf allen Geraeten.
            Ohne Login kannst du nur den Kalender mit Terminen ansehen.
          </p>
          <div className="mt-8 grid max-w-md gap-3">
            {["Automatischer Lernplan mit Spaced Repetition", "KI-Coach, Quiz und Flashcards", "XP, Streak und Analytics"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="w-full rounded-[28px] border border-slate-200/80 bg-white/90 p-7 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 lg:hidden">Klausurplaner</p>
          <h2 className="mt-2 font-display text-3xl text-slate-950 dark:text-white lg:mt-0">Anmelden</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Online-first: Melde dich an, damit deine Daten synchronisiert werden und alle Funktionen verfuegbar sind.
          </p>

          {!hasSupabaseEnv ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              Supabase ist noch nicht konfiguriert. Lege zuerst `.env` anhand von `.env.example` an.
            </div>
          ) : null}

          {hasSupabaseEnv && !hasGoogleAuthEnv ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              Google Login ist noch nicht lokal konfiguriert. Setze `VITE_GOOGLE_CLIENT_ID` in `.env` und aktiviere Google als Provider in Supabase Auth.
            </div>
          ) : null}

          {syncError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
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
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Passwort
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={!hasSupabaseEnv || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              <Mail size={16} />
              Mit E-Mail anmelden
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link
              to={ROUTES.calendar}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              <CalendarDays size={16} />
              Nur Kalender ansehen
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}