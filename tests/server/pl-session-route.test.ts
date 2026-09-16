import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/pl-classroom-session', () => ({
  readPlClassroomSession: vi.fn(),
}));

import { GET } from '@/app/api/pl/session/route';
import { readPlClassroomSession } from '@/lib/server/pl-classroom-session';

describe('PL classroom session route', () => {
  beforeEach(() => {
    process.env.PL_APP_BASE_URL = 'https://staging.pragmaticleaders.io/';
    vi.mocked(readPlClassroomSession).mockReturnValue({
      classroomId: 'course-1',
      learnerKey: `pl:${'a'.repeat(64)}`,
      returnPath: '/library/courses/mine/123',
      expiresAt: Date.now() + 60_000,
    });
  });

  it('returns a server-derived PL destination for the classroom header', async () => {
    const response = await GET(new Request('https://classroom.example/api/pl/session') as never);
    expect(await response.json()).toMatchObject({
      returnUrl: 'https://staging.pragmaticleaders.io/library/courses/mine/123',
    });
    expect(response.headers.get('x-openmaic-pl-integrated')).toBe('1');
  });

  it('signals PL integration even when the handoff cookie is absent', async () => {
    vi.mocked(readPlClassroomSession).mockReturnValue(null);
    const response = await GET(new Request('https://classroom.example/api/pl/session') as never);
    expect(response.status).toBe(404);
    expect(response.headers.get('x-openmaic-pl-integrated')).toBe('1');
  });
});
