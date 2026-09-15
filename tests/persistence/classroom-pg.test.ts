import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import {
  ensureClassroomPayloadSchema,
  readClassroomPayload,
  releaseClassroomPayload,
  reserveClassroomPayload,
  writeClassroomPayload,
} from '@/lib/persistence/classroom-pg';

function pool(rows: unknown[] = []) {
  return { query: vi.fn(async () => ({ rows })) } as {
    query: ReturnType<typeof vi.fn>;
  };
}

const payload = { id: 'abc', stage: {} as never, scenes: [], createdAt: '2026-01-01T00:00:00.000Z' };

describe('PostgreSQL classroom payload adapter', () => {
  it('creates the durable payload table and writes JSONB payloads', async () => {
    const db = pool();
    await ensureClassroomPayloadSchema(db as unknown as Pool);
    await writeClassroomPayload(db as unknown as Pool, payload);
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(String(db.query.mock.calls[0][0])).toContain('openmaic_classrooms');
    expect(db.query.mock.calls[1][1]).toEqual(['abc', JSON.stringify(payload)]);
  });

  it('hides reserved placeholders and returns completed classrooms', async () => {
    const db = pool([{ payload: { ...payload, reserved: true } }]);
    await expect(readClassroomPayload(db as unknown as Pool, 'abc')).resolves.toBeNull();
    db.query.mockResolvedValueOnce({ rows: [{ payload }] });
    await expect(readClassroomPayload(db as unknown as Pool, 'abc')).resolves.toEqual(payload);
  });

  it('uses insert-only reservation and conditional release', async () => {
    const db = pool();
    const reserved = { ...payload, reserved: true };
    await reserveClassroomPayload(db as unknown as Pool, reserved);
    await releaseClassroomPayload(db as unknown as Pool, 'abc');
    expect(String(db.query.mock.calls[0][0])).toContain('INSERT INTO openmaic_classrooms');
    expect(String(db.query.mock.calls[1][0])).toContain("payload->>'reserved'");
  });
});
