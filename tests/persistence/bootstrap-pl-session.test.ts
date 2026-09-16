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

  it('retries a transient handoff miss before choosing anonymous identity', async () => {
    const learnerKey = `pl:${'c'.repeat(64)}`;
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ learnerKey }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetch);

    await expect(resolvePlPersistenceLearnerKey()).resolves.toBe(learnerKey);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('refreshes the signed PL key for request headers after an anonymous key was cached', async () => {
    vi.stubEnv('NEXT_PUBLIC_PERSISTENCE', '1');
    vi.stubGlobal('window', {});
    const learnerKey = `pl:${'b'.repeat(64)}`;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ learnerKey }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const { getPersistenceRequestHeaders } = await import('@/lib/persistence/bootstrap');
    await expect(getPersistenceRequestHeaders()).resolves.toMatchObject({
      'x-learner-key': learnerKey,
    });
  });

  it('fails closed in PL mode, then retries successfully when the session appears', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_PERSISTENCE', '1');
    vi.stubEnv('NEXT_PUBLIC_PL_APP_BASE_URL', 'https://staging.pragmaticleaders.io');
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    const { getPersistenceLearnerKey } = await import('@/lib/persistence/bootstrap');
    await expect(getPersistenceLearnerKey()).rejects.toThrow('Signed PL classroom session unavailable');

    const learnerKey = `pl:${'d'.repeat(64)}`;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ learnerKey }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    await expect(getPersistenceLearnerKey()).resolves.toBe(learnerKey);
  });
});
