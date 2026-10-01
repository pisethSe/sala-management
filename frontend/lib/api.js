// Browser-side JSON fetch helper for the NestJS API. Throws an Error with the
// server's message on failure. Every request carries the Supabase session's
// access token as a Bearer header; the API verifies it against the JWKS.
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function api(method, url, body){
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(base + url, {
    method, cache:'no-store',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type':'application/json' }),
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}
