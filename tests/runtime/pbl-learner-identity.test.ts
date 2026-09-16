import { describe, expect, it, vi } from 'vitest';

import { getPBLLearnerKey } from '@/lib/pbl/v2/runtime/learner-identity';
import { resetRuntimeStorageForTests, configureRuntimeStorage } from '@/lib/runtime/config';

describe('PBL learner identity', () => {
  it('uses configured PL identity before an injected device KV', async () => {
    resetRuntimeStorageForTests();
    const kv = { get: vi.fn().mockResolvedValue('anon:device'), set: vi.fn() } as never;
    configureRuntimeStorage({ learnerKey: async () => 'pl:configured' });
    await expect(getPBLLearnerKey(kv)).resolves.toBe('pl:configured');
    expect(kv.get).not.toHaveBeenCalled();
    resetRuntimeStorageForTests();
  });
});
