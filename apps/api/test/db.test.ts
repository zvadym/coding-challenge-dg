import { afterEach, describe, expect, test } from 'bun:test';
import { createDatabase } from '../src/db/client';
import { healthChecks } from '../src/db/schema';

const pools: Array<{ end: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(pools.map((pool) => pool.end()));
  pools.length = 0;
});

describe('database migrations', () => {
  test('health_checks table accepts inserts', async () => {
    const { db, pool } = createDatabase();
    pools.push(pool);

    const [inserted] = await db
      .insert(healthChecks)
      .values({
        service: 'api'
      })
      .returning({
        id: healthChecks.id,
        service: healthChecks.service
      });

    expect(inserted).toEqual({
      id: expect.any(Number),
      service: 'api'
    });
  });
});
