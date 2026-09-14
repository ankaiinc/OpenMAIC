import { afterEach, describe, expect, it } from 'vitest';
import { isAuthorizedPlServiceRequest } from '@/lib/server/pl-service-auth';

afterEach(() => {
  delete process.env.OPENMAIC_HANDOFF_SECRET;
});

describe('PL service authentication', () => {
  it('admits only the configured bearer secret', async () => {
    process.env.OPENMAIC_HANDOFF_SECRET = 'shared-secret-with-at-least-32-bytes';

    expect(await isAuthorizedPlServiceRequest(new Headers({
      authorization: 'Bearer shared-secret-with-at-least-32-bytes',
    }))).toBe(true);
    expect(await isAuthorizedPlServiceRequest(new Headers({
      authorization: 'Bearer wrong-secret',
    }))).toBe(false);
    expect(await isAuthorizedPlServiceRequest(new Headers())).toBe(false);
  });
});
