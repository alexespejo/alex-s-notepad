import { NextResponse } from "next/server";

/**
 * Dev-only: confirms which external auth providers Supabase reports for the project
 * in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export async function GET() {
 if (process.env.NODE_ENV === "production") {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
 }

 const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
 const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!base || !key) {
  return NextResponse.json(
   {
    error:
     "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
   },
   { status: 500 },
  );
 }

 const res = await fetch(`${base}/auth/v1/settings`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  cache: "no-store",
 });

 let body: Record<string, unknown> = {};
 try {
  body = (await res.json()) as Record<string, unknown>;
 } catch {
  body = {};
 }

 const externalRaw = body.external;
 const googleEnabled =
  typeof externalRaw === "object" &&
  externalRaw !== null &&
  "google" in externalRaw &&
  Boolean((externalRaw as { google?: boolean }).google);

 const enabledProviders =
  typeof externalRaw === "object" && externalRaw !== null
   ? Object.entries(externalRaw as Record<string, boolean>)
      .filter(([, on]) => on === true)
      .map(([name]) => name)
   : [];

 return NextResponse.json(
  {
   httpStatus: res.status,
   projectUrl: base,
   googleEnabled,
   enabledExternalProviders: enabledProviders.length ? enabledProviders : null,
   message: !res.ok
    ? "Could not load /auth/v1/settings — check URL and anon/publishable key."
    : googleEnabled
      ? "Supabase reports Google as enabled. If you still get validation_failed, redeploy/restart and confirm this URL matches the project where you configured Google."
      : "Supabase reports Google as disabled. Dashboard → Authentication → Sign In / Providers → Google: turn on, add OAuth Client ID + Client Secret, click Save. Google Cloud redirect: {project-ref}.supabase.co/auth/v1/callback",
  },
  { status: 200 },
 );
}
