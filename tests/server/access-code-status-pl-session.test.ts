import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn(),
  readPlClassroomSession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
  headers: mocks.headers,
}));

vi.mock('@/lib/server/pl-classroom-session', () => ({
  readPlClassroomSession: mocks.readPlClassroomSession,
}));

import { GET } from '@/app/api/access-code/status/route';

afterEach(() => {
  delete process.env.ACCESS_CODE;
  vi.clearAllMocks();
});

describe('access-code status for PL classrooms', () => {
  it('accepts a valid scoped PL classroom session without an operator access code', async () => {
    process.env.ACCESS_CODE = 'operator-code';
    mocks.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) });
    mocks.headers.mockResolvedValue(new Headers({ cookie: 'pl_classroom_session=signed' }));
    mocks.readPlClassroomSession.mockReturnValue({
      classroomId: 'classroom-1',
      learnerKey: `pl:${'a'.repeat(64)}`,
      returnPath: '/library/courses/mine/course-1',
      expiresAt: Date.now() + 60_000,
    });

    const response = await GET();
    expect(await response.json()).toMatchObject({
      success: true,
      enabled: true,
      authenticated: true,
    });
  });
});
