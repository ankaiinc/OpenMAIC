import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createPlClassroomSession,
  PL_CLASSROOM_COOKIE,
  readPlClassroomSessionFromCookie,
} from '@/lib/server/pl-classroom-session';

describe('PL classroom session', () => {
  beforeEach(() => {
    process.env.OPENMAIC_HANDOFF_SECRET = 'test-shared-secret';
  });

  afterEach(() => {
    delete process.env.OPENMAIC_HANDOFF_SECRET;
  });

  it('round trips an owner-bound classroom session', () => {
    const token = createPlClassroomSession({
      classroomId: 'classroom-1',
      learnerKey: `pl:${'a'.repeat(64)}`,
      returnPath: '/library/courses/mine/course-1',
      now: 1_000,
    });
    expect(readPlClassroomSessionFromCookie(
      `${PL_CLASSROOM_COOKIE}=${encodeURIComponent(token)}`,
      2_000,
    )).toEqual({
      classroomId: 'classroom-1',
      learnerKey: `pl:${'a'.repeat(64)}`,
      returnPath: '/library/courses/mine/course-1',
      expiresAt: 43_201_000,
    });
  });

  it('rejects tampering, expiry, and an external return address', () => {
    const token = createPlClassroomSession({
      classroomId: 'classroom-1',
      learnerKey: `pl:${'b'.repeat(64)}`,
      returnPath: '/library/courses/mine/course-1',
      now: 1_000,
    });
    expect(readPlClassroomSessionFromCookie(
      `${PL_CLASSROOM_COOKIE}=${encodeURIComponent(`${token}x`)}`,
      2_000,
    )).toBeNull();
    expect(readPlClassroomSessionFromCookie(
      `${PL_CLASSROOM_COOKIE}=${encodeURIComponent(token)}`,
      43_201_001,
    )).toBeNull();
    expect(() => createPlClassroomSession({
      classroomId: 'classroom-1',
      learnerKey: `pl:${'b'.repeat(64)}`,
      returnPath: 'https://evil.test',
    })).toThrow('Invalid PL classroom session');
  });
});
