import { createHmac, timingSafeEqual } from 'node:crypto';

export const PL_CLASSROOM_COOKIE = 'pl_classroom_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type PlClassroomSession = {
  classroomId: string;
  learnerKey: string;
  returnPath: string;
  expiresAt: number;
};

function secret(): string | null {
  return process.env.OPENMAIC_HANDOFF_SECRET?.trim() || null;
}

function signature(payload: string, signingSecret: string): string {
  return createHmac('sha256', signingSecret).update(payload).digest('base64url');
}

function validReturnPath(value: unknown): value is string {
  return typeof value === 'string'
    && /^\/library\/courses\/mine\/[A-Za-z0-9-]+$/.test(value);
}

export function createPlClassroomSession(input: {
  classroomId: string;
  learnerKey: string;
  returnPath: string;
  now?: number;
}): string {
  const signingSecret = secret();
  if (!signingSecret) throw new Error('OPENMAIC_HANDOFF_SECRET is not configured');
  if (
    !/^[A-Za-z0-9_-]{3,200}$/.test(input.classroomId)
    || !/^pl:[a-f0-9]{64}$/.test(input.learnerKey)
    || !validReturnPath(input.returnPath)
  ) throw new Error('Invalid PL classroom session');
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    classroomId: input.classroomId,
    learnerKey: input.learnerKey,
    returnPath: input.returnPath,
    expiresAt: (input.now ?? Date.now()) + SESSION_TTL_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${signature(payload, signingSecret)}`;
}

export function readPlClassroomSessionFromCookie(
  cookieHeader: string | null | undefined,
  now = Date.now(),
): PlClassroomSession | null {
  const signingSecret = secret();
  if (!signingSecret || !cookieHeader) return null;
  const encoded = cookieHeader.split(';').map((item) => item.trim()).find(
    (item) => item.startsWith(`${PL_CLASSROOM_COOKIE}=`),
  )?.slice(PL_CLASSROOM_COOKIE.length + 1);
  if (!encoded) return null;
  let token: string;
  try { token = decodeURIComponent(encoded); } catch { return null; }
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const supplied = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(signature(payload, signingSecret));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<PlClassroomSession> & { v?: unknown };
    if (
      parsed.v !== 1
      || typeof parsed.classroomId !== 'string'
      || !/^[A-Za-z0-9_-]{3,200}$/.test(parsed.classroomId)
      || typeof parsed.learnerKey !== 'string'
      || !/^pl:[a-f0-9]{64}$/.test(parsed.learnerKey)
      || !validReturnPath(parsed.returnPath)
      || typeof parsed.expiresAt !== 'number'
      || parsed.expiresAt <= now
    ) return null;
    return {
      classroomId: parsed.classroomId,
      learnerKey: parsed.learnerKey,
      returnPath: parsed.returnPath,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function readPlClassroomSession(headers: Headers): PlClassroomSession | null {
  return readPlClassroomSessionFromCookie(headers.get('cookie'));
}

export function plClassroomCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${PL_CLASSROOM_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}
