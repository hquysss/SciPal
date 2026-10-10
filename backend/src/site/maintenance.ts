import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Maintenance mode (site_settings.maintenance): the API answers 503 to everyone but admins, except
// what must keep working: the health check and the payment provider's webhook.

const OPEN = new Set(['/health', '/api/billing/webhooks/payos', '/api/billing/webhooks/momo', '/api/internal/billing/renewals/run', '/api/billing/renewal/cancel']);

export const MAINTENANCE_BODY = {
  code: 'MAINTENANCE',
  error: 'SciPal đang bảo trì. Bạn quay lại sau nhé.',
  error_en: 'SciPal is under maintenance. Please come back later.',
};

export function maintenanceHook(app: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];
    if (request.method === 'OPTIONS' || OPEN.has(path) || !app.siteSettings) return;
    if ((request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user?.app_metadata?.app_role === 'admin') return;
    if (!(await app.siteSettings.get()).maintenance) return;
    return reply.code(503).send(MAINTENANCE_BODY);
  };
}
