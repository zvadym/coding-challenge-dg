import { afterEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/db/client';
import { followers, healthChecks, tweets, users } from '../src/db/schema';

const pools: Array<{ end: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(pools.map((pool) => pool.end()));
  pools.length = 0;
});

describe('database migrations', () => {
  function testId(): string {
    return randomUUID().slice(0, 8);
  }

  function hasPostgresCode(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    );
  }

  async function expectDatabaseErrorCode(
    operation: PromiseLike<unknown>,
    expectedCode: string
  ): Promise<void> {
    try {
      await operation;
    } catch (error) {
      const cause = error instanceof Error ? error.cause : undefined;
      const postgresError = hasPostgresCode(cause)
        ? cause
        : hasPostgresCode(error)
          ? error
          : undefined;

      expect(postgresError?.code).toBe(expectedCode);
      return;
    }

    throw new Error(`Expected database error code ${expectedCode}`);
  }

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

  test('users, tweets, and followers accept valid inserts', async () => {
    const { db, pool } = createDatabase();
    pools.push(pool);
    const suffix = testId();

    const [bob] = await db
      .insert(users)
      .values({
        username: `bob_valid_${suffix}`,
        email: `bob-valid-${suffix}@example.com`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
        firstName: 'Bob',
        lastName: 'Builder',
        age: 42
      })
      .returning({ id: users.id });

    const [alice] = await db
      .insert(users)
      .values({
        username: `alice_valid_${suffix}`,
        email: `alice-valid-${suffix}@example.com`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash'
      })
      .returning({ id: users.id });

    const [tweet] = await db
      .insert(tweets)
      .values({
        authorId: alice.id,
        text: 'Hello from Alice.'
      })
      .returning({ id: tweets.id, text: tweets.text });

    const [follow] = await db
      .insert(followers)
      .values({
        followerId: bob.id,
        followingId: alice.id
      })
      .returning({ followerId: followers.followerId, followingId: followers.followingId });

    expect(tweet).toEqual({
      id: expect.any(Number),
      text: 'Hello from Alice.'
    });
    expect(follow).toEqual({
      followerId: bob.id,
      followingId: alice.id
    });
  });

  test('duplicate follows are rejected', async () => {
    const { db, pool } = createDatabase();
    pools.push(pool);
    const suffix = testId();

    const [bob] = await db
      .insert(users)
      .values({
        username: `bob_dupe_${suffix}`,
        email: `bob-dupe-${suffix}@example.com`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash'
      })
      .returning({ id: users.id });

    const [alice] = await db
      .insert(users)
      .values({
        username: `alice_dupe_${suffix}`,
        email: `alice-dupe-${suffix}@example.com`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash'
      })
      .returning({ id: users.id });

    await db.insert(followers).values({
      followerId: bob.id,
      followingId: alice.id
    });

    await expectDatabaseErrorCode(
      db.insert(followers).values({
        followerId: bob.id,
        followingId: alice.id
      }),
      '23505'
    );
  });

  test('self-follows are rejected', async () => {
    const { db, pool } = createDatabase();
    pools.push(pool);
    const suffix = testId();

    const [bob] = await db
      .insert(users)
      .values({
        username: `bob_self_${suffix}`,
        email: `bob-self-${suffix}@example.com`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash'
      })
      .returning({ id: users.id });

    await expectDatabaseErrorCode(
      db.insert(followers).values({
        followerId: bob.id,
        followingId: bob.id
      }),
      '23514'
    );
  });

  test('empty tweets are rejected', async () => {
    const { db, pool } = createDatabase();
    pools.push(pool);
    const suffix = testId();

    const [bob] = await db
      .insert(users)
      .values({
        username: `bob_empty_${suffix}`,
        email: `bob-empty-${suffix}@example.com`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash'
      })
      .returning({ id: users.id });

    await expectDatabaseErrorCode(
      db.insert(tweets).values({
        authorId: bob.id,
        text: ''
      }),
      '23514'
    );
  });
});
