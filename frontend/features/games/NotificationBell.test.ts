import { describe, expect, it, vi } from 'vitest';

const listNotifications = vi.fn();
const rt = vi.hoisted(() => ({ opened: 0, removed: 0, insert: () => {} }));
vi.mock('./gamesApi', () => ({ listNotifications: () => listNotifications() }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => {
    const channel = {
      on: (_e: string, _f: unknown, cb: () => void) => { rt.insert = cb; return channel; },
      subscribe: () => { rt.opened += 1; return channel; },
    };
    return {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
      channel: () => channel,
      removeChannel: async () => { rt.removed += 1; },
    };
  },
}));

const { loadNotificationsShared, subscribeNotifications } = await import('./NotificationBell');

describe('loadNotificationsShared', () => {
  it('gives both nav bells one request while it is in flight, then fetches fresh', async () => {
    listNotifications.mockResolvedValue({ ok: true, data: { notifications: [], unread: 0 } });
    const [a, b] = [loadNotificationsShared(), loadNotificationsShared()];
    expect(a).toBe(b);
    await a;
    expect(listNotifications).toHaveBeenCalledTimes(1);
    await loadNotificationsShared();
    expect(listNotifications).toHaveBeenCalledTimes(2);
  });
});

describe('subscribeNotifications', () => {
  it('opens one channel for both bells, tells both, and closes with the last', async () => {
    const desktop = vi.fn();
    const phone = vi.fn();
    const offDesktop = subscribeNotifications(desktop);
    const offPhone = subscribeNotifications(phone);
    await vi.waitFor(() => expect(rt.opened).toBe(1));
    rt.insert();
    expect([desktop.mock.calls.length, phone.mock.calls.length]).toEqual([1, 1]);
    offDesktop();
    expect(rt.removed).toBe(0);
    offPhone();
    expect(rt.removed).toBe(1);
  });
});
