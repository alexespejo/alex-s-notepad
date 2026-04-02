"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : "/";
  }, [searchParams]);
  const err = searchParams.get("error");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    err === "auth" ? "Could not complete sign-in. Try again." : err === "config" ? "App configuration error." : err === "unauthorized" ? "This account is not authorized to access this app." : null,
  );

  async function signInWithGoogle() {
    setMessage(null);
    setBusy(true);
    const supabase = createSupabaseClient();
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      const raw = error.message;
      const isProviderDisabled =
        /unsupported provider|provider is not enabled|not enabled/i.test(raw);
      setMessage(
        isProviderDisabled
          ? "Google isn’t enabled for the Supabase project in your .env (or the keys are for another project). Fix it in the Supabase dashboard under Authentication → Sign In / Providers → Google (Client ID + Secret, Save). In Google Cloud, the redirect URI must be https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback"
          : raw,
      );
      setBusy(false);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setMessage("Could not start Google sign-in.");
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-white px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Continue with your Google account.</p>

        <div className="mt-6 space-y-4">
          {process.env.NODE_ENV === "development" ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Dev:{" "}
              <a href="/api/debug/auth-config" className="underline underline-offset-2">
                check whether this project has Google enabled
              </a>{" "}
              (reads /auth/v1/settings).
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {message}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void signInWithGoogle()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            <GoogleGlyph />
            {busy ? "Redirecting…" : "Continue with Google"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
