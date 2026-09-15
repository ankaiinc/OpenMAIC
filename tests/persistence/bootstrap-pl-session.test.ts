import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolvePlPersistenceLearnerKey } from '@/lib/persistence/bootstrap';

describe('PL persistence learner identity', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the signed PL classroom learner key for persistence requests', async () => {
    const learnerKey = `pl:${'a'.repeat(64)}`;
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ learnerKey }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetch);

    await expect(resolvePlPersistenceLearnerKey()).resolves.toBe(learnerKey);
    expect(fetch).toHaveBeenCalledWith('/api/pl/session', {
      credentials: 'include',
      cache: 'no-store',
    });
  });

  it('falls back when no valid PL classroom session exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));

    await expect(resolvePlPersistenceLearnerKey()).resolves.toBeNull();
  });
});
