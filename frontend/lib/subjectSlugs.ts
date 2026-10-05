// The subjects that exist, for the edge middleware: a visitor's trial window opens on a real subject
// page, not on a mistyped address that ends in the 404 page.

/** The subject slugs, read with the public key; null when they cannot be read (then every address counts). */
export async function fetchSubjectSlugs(): Promise<Set<string> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/subjects?select=slug`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ slug?: unknown }>;
    if (!Array.isArray(rows)) return null;
    return new Set(rows.flatMap((row) => (typeof row.slug === 'string' ? [row.slug] : [])));
  } catch {
    return null;
  }
}
