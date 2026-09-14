import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/release/route';

afterEach(() => {
  delete process.env.RELEASE_SHA;
});

describe('release route', () => {
  it('reports the exact deployed source revision without caching', async () => {
    process.env.RELEASE_SHA = '98765db8b3369247aa4c3ba1e0d957064d234251';

    const response = GET();

    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      releaseSha: '98765db8b3369247aa4c3ba1e0d957064d234251',
    });
  });
});
