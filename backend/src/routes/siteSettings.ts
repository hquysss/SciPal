import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SITE_FEATURES, resolveSiteSettings, type SiteSettings, type SiteSettingsRow } from '../site/features.js';

// Admin site switches (/admin/site): sign-up open or closed and features on or off. The web reads the
// row directly (everyone may); routes that a switch guards ask `siteSettings` here.

const COLUMNS = 'signup_enabled, features, maintenance, updated_at';
const CACHE_MS = 30_000;
const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ lưu trữ chưa sẵn sàng.', 'Storage is not available.');

export async function loadSiteSettings(supabase: SupabaseClient | null | undefined): Promise<SiteSettingsRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('site_settings').select(COLUMNS).eq('id', 1).maybeSingle();
  if (error) throw error;
  return (data as SiteSettingsRow | null) ?? null;
}

export type SiteSettingsStore = ReturnType<typeof siteSettingsStore>;

declare module 'fastify' {
  interface FastifyInstance {
    /** The admin's site switches; without it everything is on. */
    siteSettings?: SiteSettingsStore;
  }
}

/** The switches in force, cached briefly; on a read error everything stays on. */
export function siteSettingsStore(load: () => Promise<SiteSettingsRow | null>) {
  let cached: { at: number; value: SiteSettings } | null = null;
  return {
    async get(): Promise<SiteSettings> {
      if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
      let row: SiteSettingsRow | null = null;
      try {
        row = await load();
      } catch {
        row = null;
      }
      cached = { at: Date.now(), value: resolveSiteSettings(row) };
      return cached.value;
    },
    invalidate() {
      cached = null;
    },
  };
}

type Patch = { signup_enabled: boolean; features: Record<string, boolean>; maintenance?: boolean };

function parsePatch(body: unknown): Patch | null {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.signup_enabled !== 'boolean') return null;
  const f = b.features;
  if (!f || typeof f !== 'object' || Array.isArray(f)) return null;
  const features: Record<string, boolean> = {};
  for (const [key, on] of Object.entries(f as Record<string, unknown>)) {
    if (!(SITE_FEATURES as readonly string[]).includes(key) || typeof on !== 'boolean') return null;
    features[key] = on;
  }
  if (b.maintenance !== undefined && typeof b.maintenance !== 'boolean') return null;
  return { signup_enabled: b.signup_enabled, features, ...(b.maintenance === undefined ? {} : { maintenance: b.maintenance }) };
}

export const siteSettingsRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send(msg('Chỉ admin mới chỉnh cài đặt trang.', 'Only admins change the site settings.'));
    }
  };

  app.get('/api/admin/site-settings', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    try {
      return reply.send(resolveSiteSettings(await loadSiteSettings(app.supabase)));
    } catch (err) {
      request.log.error({ err }, 'Failed to read site settings');
      return reply.code(500).send(msg('Không đọc được cài đặt trang.', 'Could not read the site settings.'));
    }
  });

  app.patch('/api/admin/site-settings', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const patch = parsePatch(request.body);
    if (!patch) return reply.code(400).send(msg('Cài đặt không hợp lệ.', 'Invalid settings.'));
    const userId = (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
    const { data, error } = await app.supabase
      .from('site_settings')
      .upsert({ id: 1, ...patch, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: 'id' })
      .select(COLUMNS)
      .single();
    if (error) {
      request.log.error({ err: error }, 'Failed to save site settings');
      return reply.code(500).send(msg('Không lưu được cài đặt trang.', 'Could not save the site settings.'));
    }
    app.siteSettings?.invalidate();
    return reply.send(resolveSiteSettings(data as SiteSettingsRow));
  });
};
