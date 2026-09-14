import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { releaseSha: process.env.RELEASE_SHA?.trim() || 'unknown' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
