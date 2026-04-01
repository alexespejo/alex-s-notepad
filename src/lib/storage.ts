import { createSupabaseClient } from "@/lib/supabase/client";

const BUCKET = "images";
const SIGNED_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days (Supabase allows up to this range on many projects)

function safeImageExt(filename: string, fallback: string) {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return fallback;
}

function parseStorageSignPath(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const marker = "/object/sign/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const rest = u.pathname.slice(idx + marker.length);
    const segments = rest.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const bucket = segments[0];
    const path = segments.slice(1).join("/");
    return { bucket, path };
  } catch {
    return null;
  }
}

function parseStoragePublicPath(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const marker = "/object/public/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const rest = u.pathname.slice(idx + marker.length);
    const segments = rest.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const bucket = segments[0];
    const path = segments.slice(1).join("/");
    return { bucket, path };
  } catch {
    return null;
  }
}

async function signedUrlForBucketPath(bucket: string, path: string): Promise<string | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Re-sign storage URLs for the editor (signed links expire). Handles legacy public object URLs. */
export async function resolveImageUrlForEditor(url: string): Promise<string> {
  const signed = parseStorageSignPath(url);
  if (signed && signed.bucket === BUCKET) {
    const next = await signedUrlForBucketPath(signed.bucket, signed.path);
    return next ?? url;
  }
  const pub = parseStoragePublicPath(url);
  if (pub && pub.bucket === BUCKET) {
    const next = await signedUrlForBucketPath(pub.bucket, pub.path);
    return next ?? url;
  }
  return url;
}

export async function uploadEditorImageForPage(pageId: string, file: File): Promise<string> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to upload images.");

  const mime = file.type || "application/octet-stream";
  const extFromMime =
    mime === "image/png"
      ? "png"
      : mime === "image/jpeg" || mime === "image/jpg"
        ? "jpg"
        : mime === "image/gif"
          ? "gif"
          : mime === "image/webp"
            ? "webp"
            : mime === "image/svg+xml"
              ? "svg"
              : "bin";
  const ext = safeImageExt(file.name, extFromMime);
  const path = `${user.id}/pages/${pageId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (signError || !data?.signedUrl) {
    throw signError ?? new Error("Could not create signed URL for upload.");
  }
  return data.signedUrl;
}
