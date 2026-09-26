// frontend/features/authoring/topicApi.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthoringApiError } from './authoringQueries';
import { createAuthoringTopic } from './topicApi';

const input = { subject_id: 's', grade: 4, name_en: 'Plants', name_vi: 'Thực vật' };
const topic = { id: 't', subject_id: 's', grade: 4, name_en: 'Plants', name_vi: 'Thực vật', sort_order: 0 };
const respond = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

afterEach(() => vi.unstubAllGlobals());

describe('createAuthoringTopic', () => {
  it('returns a created topic', async () => {
    respond(201, { topic });
    await expect(createAuthoringTopic('tok', input)).resolves.toEqual({ kind: 'created', topic });
    expect(vi.mocked(fetch).mock.calls[0]![1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok' } });
  });

  it('returns the existing topic on 409', async () => {
    respond(409, { error: 'Chủ đề này đã có.', topic });
    await expect(createAuthoringTopic('tok', input)).resolves.toEqual({ kind: 'existing', topic });
  });

  it('throws the server message otherwise', async () => {
    respond(400, { error: 'Lớp này không thuộc chương trình của môn đã chọn.' });
    await expect(createAuthoringTopic('tok', input)).rejects.toThrow(AuthoringApiError);
  });
});
