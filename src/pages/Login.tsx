import { useEffect, useState } from "react";
import { CalendarDays, Chrome, Mail, UserPlus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { t } from "../lib/i18n";
import { getSupabaseConfigIssue, hasGoogleAuthEnv, hasSupabaseEnv } from "../lib/supabase";
import { useAppStore } from "../store/useAppStore";

type AuthMode = "login" | "signup";

interface LoginPageProps {
  mode?: AuthMode;
}

export function LoginPage({ mode = "login" }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const authReady = useAppStore((state) => state.authReady);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const login = useAppStore((state) => state.login);
  const signUp = useAppStore((state) => state.signUp);
  const language = useAppStore((state) => state.settings.language);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;
  const isSignup = mode === "signup";
  const configIssue = getSupabaseConfigIssue();

  useEffect(() => {
    if (authReady && isAuthenticated) navigate(redirectTo, { replace: true });
  }, [authReady, isAuthenticated, navigate, redirectTo]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.1),_transparent_30%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-6">
        <section className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{t("app.name", language)}</p>
          <h1 className="mt-4 max-w-lg font-display text-5xl leading-tight text-slate-950 dark:text-white">
            {isSignup ? "Account erstellen und loslegen." : "Willkommen zurück."}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600 dark:text-slate-300">
            Mit Account merkt sich Supabase deine Sitzung, synchronisiert deine Daten zwischen Geraeten und haelt die App nach dem Laden auch offline nutzbar.
          </p>
        </section>

        <section className="w-full rounded-[28px] border border-slate-200/80 bg-white/90 p-7 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="segmented-control w-full">
            <Link
              to={ROUTES.signup}
              className={`segmented-control__item flex-1 text-center ${isSignup ? "segmented-control__item--active" : ""}`}
            >
              {t("login.signupTitle", language)}
            </Link>
            <Link
              to={ROUTES.login}
              className={`segmented-control__item flex-1 text-center ${!isSignup ? "segmented-control__item--active" : ""}`}
            >
              {t("login.title", language)}
            </Link>
          </div>

          <h2 className="mt-6 font-display text-3xl text-slate-950 dark:text-white">
            {isSignup ? t("login.signupTitle", language) : t("login.title", language)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isSignup
              ? "Erstelle einen Account fuer Cloud-Sync, Offline-Cache und deinen Lernfortschritt auf mehreren Geraeten."
              : "Deine Supabase Sitzung bleibt gespeichert und wird beim naechsten Start automatisch wiederhergestellt."}
          </p>

          {!hasSupabaseEnv || configIssue ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {configIssue ?? "Supabase ist nicht konfiguriert. Lege `.env` anhand von `.env.example` an und starte den Dev-Server neu."}
            </div>
          ) : null}

          {hasSupabaseEnv && !hasGoogleAuthEnv ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              Google Login ist noch nicht konfiguriert. E-Mail-Registrierung funktioniert trotzdem.
            </div>
          ) : null}

          {authError ? (
            <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              <p>{authError}</p>
              {showResend ? (
                <button
                  type="button"
                  disabled={resending}
                  onClick={async () => {
                    setResending(true);
                    try {
                      const { resendConfirmationEmail } = await import("../services/syncService");
                      await resendConfirmationEmail(email);
                      setAuthInfo("Bestätigungs-E-Mail wurde erneut gesendet.");
                      setAuthError(null);
                      setShowResend(false);
                    } catch (error) {
                      setAuthError(error instanceof Error ? error.message : "Erneutes Senden fehlgeschlagen.");
                    } finally {
                      setResending(false);
                    }
                  }}
                  className="mt-2 text-sm font-semibold text-rose-700 underline disabled:opacity-50 dark:text-rose-300"
                >
                  {resending ? "Wird gesendet..." : "Keine Mail da? Erneut senden"}
                </button>
              ) : null}
            </div>
          ) : null}

          {authInfo ? (
            <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300">
              {authInfo}
            </div>
          ) : null}

          {!isSignup ? (
            <div className="mt-6 space-y-3">
              <button
                disabled={!hasGoogleAuthEnv || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setAuthError(null);
                  setAuthInfo(null);
                  try {
                    await login("google");
                  } catch (error) {
                    setAuthError(error instanceof Error ? error.message : "Google-Anmeldung fehlgeschlagen.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
              >
                <Chrome size={16} aria-hidden="true" />
                {t("login.googleLogin", language)}
              </button>
            </div>
          ) : null}

          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);
              setAuthError(null);
              setAuthInfo(null);
              try {
                if (isSignup) {
                  const { needsEmailConfirmation } = await signUp(email, password);
                  if (needsEmailConfirmation) {
                    setAuthInfo("Account erstellt. Bitte bestätige deine E-Mail und melde dich danach an.");
                    navigate(ROUTES.login, { replace: true });
                  }
                } else {
                  await login("email", email, password);
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : isSignup ? "Registrierung fehlgeschlagen." : "Anmeldung fehlgeschlagen.";
                setAuthError(message);
                setShowResend(message.toLowerCase().includes("e-mail") && message.toLowerCase().includes("bestätige"));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("login.email", language)}
              <input
                id="login-email"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("login.password", language)}
              <input
                id="login-password"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </label>
            <button
              type="submit"
              disabled={!hasSupabaseEnv || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              {isSignup ? <UserPlus size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
              {isSignup ? t("login.signupButton", language) : "Mit E-Mail anmelden"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link
              to={ROUTES.calendar}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              <CalendarDays size={16} aria-hidden="true" />
              Nur Kalender ansehen
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}