import { NextRequest, NextResponse } from 'next/server';
import { readPlClassroomSession } from '@/lib/server/pl-classroom-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = readPlClassroomSession(request.headers);
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    classroomId: session.classroomId,
    learnerKey: session.learnerKey,
    returnPath: session.returnPath,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
