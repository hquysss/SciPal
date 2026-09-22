import {
  createBrowserClient as _createBrowserClient,
  createServerClient as _createServerClient,
} from '@supabase/ssr';
import type { Database } from './types';

export interface CookieStore {
  get?: (name: string) => { value: string } | undefined;
  getAll?: () => { name: string; value: string }[];
  set?: (...args: any[]) => any;
  setAll?: (...args: any[]) => any;
}

/** Use in React components (browser) */
export function createBrowserClient(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
) {
  return _createBrowserClient<Database>(supabaseUrl, supabaseKey);
}

/** Use in Next.js Server Components / Route Handlers */
export function createServerClient(
  cookieStore: CookieStore,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
) {
  if (typeof cookieStore.getAll === 'function') {
    return _createServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll!();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set?.(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    });
  }

  return _createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get?.(name)?.value;
      },
    },
  });
}

export type { Database };
