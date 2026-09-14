import { NextRequest, NextResponse } from 'next/server';

import { isAgentRuntimeConfigured, isProWorkbenchEnabled } from '@/lib/config/feature-flags';
import { isAuthorizedPlServiceRequest } from '@/lib/server/pl-service-auth';
const PL_CLASSROOM_COOKIE = 'pl_classroom_session';

async function readPlClassroomSession(request: NextRequest): Promise<{ classroomId: string } | null> {
  const signingSecret = process.env.OPENMAIC_HANDOFF_SECRET?.trim();
  const token = request.cookies.get(PL_CLASSROOM_COOKIE)?.value;
  if (!signingSecret || !token) return null;
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expectedBytes = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  ));
  const expected = btoa(String.fromCharCode(...expectedBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (signature.length !== expected.length) return null;
  let mismatch = 0;
  for (let index = 0; index < signature.length; index += 1) {
    mismatch |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  if (mismatch !== 0) return null;
  try {
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      v?: unknown;
      classroomId?: unknown;
      expiresAt?: unknown;
    };
    if (
      parsed.v !== 1
      || typeof parsed.classroomId !== 'string'
      || typeof parsed.expiresAt !== 'number'
      || parsed.expiresAt <= Date.now()
    ) return null;
    return { classroomId: parsed.classroomId };
  } catch {
    return null;
  }
}

function isPlClassroomRuntimePath(pathname: string): boolean {
  return pathname.startsWith('/classroom/')
    || pathname === '/api/classroom'
    || pathname.startsWith('/api/classroom-media/')
    || pathname.startsWith('/api/stage-meta/')
    || pathname.startsWith('/api/persistence/')
    || pathname === '/api/chat'
    || pathname === '/api/chat/pi'
    || pathname.startsWith('/api/chat/pi/')
    || pathname === '/api/proxy-media'
    || pathname === '/api/generate/tts'
    || pathname === '/api/transcription'
    || pathname.startsWith('/api/transcription/')
    || pathname === '/api/pl/session';
}

function isPlServerRuntimePath(pathname: string): boolean {
  return pathname === '/api/generate-classroom'
    || pathname.startsWith('/api/generate-classroom/')
    || pathname === '/api/classroom';
}

/** Convert string to Uint8Array */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Convert ArrayBuffer to hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify an HMAC-signed token using Web Crypto API (Edge-compatible) */
async function verifyToken(token: string, accessCode: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const keyData = encode(accessCode);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const data = encode(timestamp);
  const expected = bufToHex(await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer));

  // Constant-length comparison (not truly constant-time in JS, but sufficient here)
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPlServerRuntimePath(pathname) && await isAuthorizedPlServiceRequest(request.headers)) {
    return NextResponse.next();
  }

  const plSession = await readPlClassroomSession(request);
  if (plSession) {
    const classroomPage = pathname.match(/^\/classroom\/([^/]+)$/);
    if (classroomPage && decodeURIComponent(classroomPage[1]!) !== plSession.classroomId) {
      return new NextResponse('Not found', { status: 404 });
    }
    if (pathname === '/api/classroom') {
      const requested = request.nextUrl.searchParams.get('id');
      if (requested && requested !== plSession.classroomId) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
    }
    const media = pathname.match(/^\/api\/classroom-media\/([^/]+)\//);
    if (media && decodeURIComponent(media[1]!) !== plSession.classroomId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (isPlClassroomRuntimePath(pathname)) return NextResponse.next();
  }

  // Return an actual server-side 404 when either half of the workbench is off.
  // Edge middleware cannot reliably inspect server-only deployment variables,
  // so it enforces the public gate and leaves the complete runtime/database
  // check to Node. A Node-hosted middleware uses the same gate as startup.
  const canInspectServerRuntime = process.env.NEXT_RUNTIME !== 'edge';
  const workbenchEnabled =
    isProWorkbenchEnabled() && (!canInspectServerRuntime || isAgentRuntimeConfigured());
  if (!workbenchEnabled && (pathname === '/workbench' || pathname.startsWith('/workbench/'))) {
    return new NextResponse('Not found', { status: 404 });
  }

  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return NextResponse.next();
  }

  // Whitelist: access-code endpoints, health check
  if (
    pathname.startsWith('/api/access-code/')
    || pathname === '/api/health'
    || pathname === '/api/release'
    || pathname === '/api/pl/handoff'
  ) {
    return NextResponse.next();
  }

  // Check cookie — validate HMAC signature, not just existence
  const cookie = request.cookies.get('openmaic_access');
  if (cookie?.value && (await verifyToken(cookie.value, accessCode))) {
    return NextResponse.next();
  }

  // API requests without valid cookie → 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Access code required' },
      { status: 401 },
    );
  }

  // Page requests → let through, frontend shows modal
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
