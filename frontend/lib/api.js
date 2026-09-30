// Browser-side JSON fetch helper for the NestJS API. Throws an Error with the
// server's message on failure. The base URL comes from NEXT_PUBLIC_API_URL
// and defaults to http://localhost:3001.
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function api(method, url, body){
  const res = await fetch(base + url, {
    method, cache:'no-store',
    headers: body === undefined ? undefined : { 'Content-Type':'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}
