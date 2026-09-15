import { NextRequest, NextResponse } from 'next/server';
import { readPlClassroomSession } from '@/lib/server/pl-classroom-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = readPlClassroomSession(request.headers);
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const plOrigin = process.env.PL_APP_BASE_URL?.trim().replace(/\/$/, '');
  return NextResponse.json({
    classroomId: session.classroomId,
    learnerKey: session.learnerKey,
    returnPath: session.returnPath,
    returnUrl: plOrigin ? `${plOrigin}${session.returnPath}` : undefined,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
