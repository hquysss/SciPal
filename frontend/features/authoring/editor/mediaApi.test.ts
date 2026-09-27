import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }),
}));
import { MAX_IMAGE_BYTES, uploadLessonImage } from './mediaApi';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('uploadLessonImage', () => {
  it('refuses SVG and large files without calling the server', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect((await uploadLessonImage(new Blob(['<svg/>'], { type: 'image/svg+xml' }))).ok).toBe(false);
    const big = await uploadLessonImage(new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: 'image/png' }));
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error.vi).toMatch(/4 MB/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends raw bytes with the MIME type and returns the URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ url: 'https://u/a.png' }), { status: 201 }));
    const res = await uploadLessonImage(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    expect(res).toEqual({ ok: true, url: 'https://u/a.png' });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/authoring\/media$/);
    const headers = init!.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('image/png');
    expect(headers.Authorization).toBe('Bearer tok');
  });

  it('shows the server message on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Tệp không phải ảnh' }), { status: 400 }));
    const res = await uploadLessonImage(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.vi).toBe('Tệp không phải ảnh');
  });
});
