import { createBrowserClient } from './supabase';

/** Access token of the current browser session, or undefined for guests. */
export async function getAccessToken(): Promise<string | undefined> {
  try {
    const { data } = await createBrowserClient().auth.getSession();
    return data.session?.access_token ?? undefined;
  } catch {
    return undefined;
  }
}
