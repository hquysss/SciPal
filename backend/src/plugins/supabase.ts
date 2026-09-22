import fp from 'fastify-plugin';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare module 'fastify' {
  interface FastifyInstance {
    supabase?: SupabaseClient;
  }
}

export const supabasePlugin = fp(async (app) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    const supabase = createClient(url, key);
    app.decorate('supabase', supabase);
  }
});
