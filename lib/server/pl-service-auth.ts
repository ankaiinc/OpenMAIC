function configuredSecret(): string | null {
  return process.env.OPENMAIC_HANDOFF_SECRET?.trim() || null;
}

function bearerToken(headers: Headers): string | null {
  const value = headers.get('authorization');
  const match = value?.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] || null;
}

export async function isAuthorizedPlServiceRequest(headers: Headers): Promise<boolean> {
  const expected = configuredSecret();
  const supplied = bearerToken(headers);
  if (!expected || !supplied) return false;

  const encoder = new TextEncoder();
  const [expectedDigest, suppliedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
  ]);
  const left = new Uint8Array(expectedDigest);
  const right = new Uint8Array(suppliedDigest);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    mismatch |= (left[index] || 0) ^ (right[index] || 0);
  }
  return mismatch === 0;
}

export function plServiceUnauthorized() {
  return Response.json({ error: 'not_found' }, { status: 404 });
}
