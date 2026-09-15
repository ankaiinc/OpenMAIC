import type { Pool } from 'pg';

import type { PersistedClassroomData } from '@/lib/server/classroom-storage';

export interface ClassroomPgRow {
  payload: PersistedClassroomData;
}

export async function ensureClassroomPayloadSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS openmaic_classrooms (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function readClassroomPayload(pool: Pool, id: string): Promise<PersistedClassroomData | null> {
  const result = await pool.query<ClassroomPgRow>(
    'SELECT payload FROM openmaic_classrooms WHERE id = $1',
    [id],
  );
  const payload = result.rows[0]?.payload;
  return payload?.reserved ? null : payload ?? null;
}

export async function reserveClassroomPayload(
  pool: Pool,
  payload: PersistedClassroomData,
): Promise<void> {
  await pool.query(
    `INSERT INTO openmaic_classrooms (id, payload) VALUES ($1, $2::jsonb)`,
    [payload.id, JSON.stringify(payload)],
  );
}

export async function writeClassroomPayload(
  pool: Pool,
  payload: PersistedClassroomData,
): Promise<void> {
  await pool.query(
    `INSERT INTO openmaic_classrooms (id, payload) VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [payload.id, JSON.stringify(payload)],
  );
}

export async function releaseClassroomPayload(pool: Pool, id: string): Promise<void> {
  await pool.query(
    `DELETE FROM openmaic_classrooms WHERE id = $1 AND (payload->>'reserved')::boolean = true`,
    [id],
  );
}
