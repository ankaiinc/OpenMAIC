import { cookies, headers } from 'next/headers';
import { apiSuccess } from '@/lib/server/api-response';
import { verifyAccessToken } from '@/lib/server/access-token';
import { readPlClassroomSession } from '@/lib/server/pl-classroom-session';

export async function GET() {
  const accessCode = process.env.ACCESS_CODE;
  const enabled = !!accessCode;

  let authenticated = false;
  if (enabled) {
    const cookieStore = await cookies();
    const token = cookieStore.get('openmaic_access')?.value;
    const plSession = readPlClassroomSession(await headers());
    authenticated = (!!token && verifyAccessToken(token, accessCode)) || !!plSession;
  }

  return apiSuccess({ enabled, authenticated });
}
