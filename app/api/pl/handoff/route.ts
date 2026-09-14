import { NextRequest, NextResponse } from 'next/server';
import {
  createPlClassroomSession,
  plClassroomCookieHeader,
} from '@/lib/server/pl-classroom-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ConsumeResponse = {
  classroomId?: unknown;
  learnerKey?: unknown;
  returnPath?: unknown;
};

export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get('ticket') ?? '';
  const plOrigin = process.env.PL_APP_BASE_URL?.trim().replace(/\/$/, '');
  const secret = process.env.OPENMAIC_HANDOFF_SECRET?.trim();
  if (!plOrigin || !secret || !/^[A-Za-z0-9_-]{40,80}$/.test(ticket)) {
    return new Response('Classroom link is invalid or expired.', { status: 404 });
  }

  let response: Response;
  try {
    response = await fetch(`${plOrigin}/api/learning/classroom-handoffs/consume`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ticket }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response('PL could not open this classroom. Return to PL and try again.', { status: 503 });
  }
  const body = await response.json().catch(() => null) as ConsumeResponse | null;
  if (
    !response.ok
    || typeof body?.classroomId !== 'string'
    || typeof body?.learnerKey !== 'string'
    || typeof body?.returnPath !== 'string'
  ) return new Response('Classroom link is invalid or expired.', { status: 404 });

  const session = createPlClassroomSession({
    classroomId: body.classroomId,
    learnerKey: body.learnerKey,
    returnPath: body.returnPath,
  });
  const redirect = NextResponse.redirect(new URL(`/classroom/${encodeURIComponent(body.classroomId)}`, request.url), 303);
  redirect.headers.append('Set-Cookie', plClassroomCookieHeader(session));
  redirect.headers.set('Cache-Control', 'private, no-store');
  return redirect;
}
