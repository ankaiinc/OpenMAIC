import type { KVStore } from '@openmaic/storage';

import { getLearnerKey } from '@/lib/runtime/learner-key';
import { resolveConfiguredLearnerKey } from '@/lib/runtime/config';

/** Resolve PL's configured identity before consulting the injected device KV. */
export async function getPBLLearnerKey(kv: KVStore): Promise<string> {
  const configured = resolveConfiguredLearnerKey();
  return configured ? configured : getLearnerKey(kv);
}
