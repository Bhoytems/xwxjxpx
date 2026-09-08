import { createClient } from "@supabase/supabase-js";

// This client uses the SERVICE ROLE key and must only ever be imported
// from server-side code (API routes, route handlers). Never import this
// from a client component.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
