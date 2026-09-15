import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from '@/app/api/pl/handoff/route';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('PL classroom handoff', () => {
  it('redirects to the configured public classroom origin behind a hosting proxy', async () => {
    process.env.PL_APP_BASE_URL = 'https://staging.pragmaticleaders.io';
    process.env.OPENMAIC_PUBLIC_URL = 'https://pl-classroom-staging.fly.dev';
    process.env.OPENMAIC_HANDOFF_SECRET = 'shared-secret-with-at-least-32-bytes';
    process.env.PL_CLASSROOM_SESSION_SECRET = 'session-secret-with-at-least-32-bytes';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      classroomId: 'classroom-1',
      learnerKey: `pl:${'a'.repeat(64)}`,
      returnPath: '/library/courses/mine/course-1',
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const ticket = 'a'.repeat(40);
    const response = await GET(new NextRequest(`http://0.0.0.0:3000/api/pl/handoff?ticket=${ticket}`));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://pl-classroom-staging.fly.dev/classroom/classroom-1');
    expect(response.headers.get('set-cookie')).toContain('pl_classroom_session=');
  });
});
