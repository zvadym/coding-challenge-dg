import { afterEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { FeedTweetsResponse } from '@dgchallenge/shared';
import { buildApp } from '../src/app';
import { createDatabase } from '../src/db/client';
import { followers, tweets, users } from '../src/db/schema';

const apps: FastifyInstance[] = [];
const pools: Array<{ end: () => Promise<void> }> = [];

type FeedFixture = {
  app: FastifyInstance;
  bob: {
    id: number;
    username: string;
  };
  carol: {
    id: number;
    username: string;
  };
  tieLow: {
    id: number;
    text: string;
  };
  tieHigh: {
    id: number;
    text: string;
  };
};

afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await Promise.all(pools.map((pool) => pool.end()));
  apps.length = 0;
  pools.length = 0;
});

describe('GET /users/:username/feed/tweets', () => {
  async function createFeedFixture(): Promise<FeedFixture> {
    const { db, pool } = createDatabase();
    pools.push(pool);
    const app = await buildApp({ db });
    apps.push(app);
    const suffix = randomUUID().slice(0, 8);

    const [bob, alice, carol, eve] = await db
      .insert(users)
      .values([
        {
          username: `bob_feed_${suffix}`,
          email: `bob-feed-${suffix}@example.com`,
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
          firstName: 'Bob'
        },
        {
          username: `alice_${suffix}`,
          email: `alice-feed-${suffix}@example.com`,
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
          firstName: 'Alice'
        },
        {
          username: `carol_${suffix}`,
          email: `carol-feed-${suffix}@example.com`,
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
          firstName: 'Carol'
        },
        {
          username: `eve_feed_${suffix}`,
          email: `eve-feed-${suffix}@example.com`,
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
          firstName: 'Eve'
        }
      ])
      .returning({
        id: users.id,
        username: users.username
      });

    await db.insert(followers).values([
      {
        followerId: bob.id,
        followingId: alice.id
      },
      {
        followerId: bob.id,
        followingId: carol.id
      }
    ]);

    const tieDate = new Date('2026-01-01T00:00:00.000Z');
    const [tieLow, tieHigh] = await db
      .insert(tweets)
      .values([
        {
          authorId: alice.id,
          text: 'tie low',
          createdAt: tieDate
        },
        {
          authorId: carol.id,
          text: 'tie high',
          createdAt: tieDate
        }
      ])
      .returning({ id: tweets.id, text: tweets.text });

    await db.insert(tweets).values([
      {
        authorId: bob.id,
        text: 'bob own newer tweet',
        createdAt: new Date('2026-01-02T00:00:00.000Z')
      },
      {
        authorId: eve.id,
        text: 'eve unfollowed newer tweet',
        createdAt: new Date('2026-01-02T00:01:00.000Z')
      },
      ...Array.from({ length: 31 }, (_, index) => ({
        authorId: index % 2 === 0 ? alice.id : carol.id,
        text: `followed older ${index}`,
        createdAt: new Date(Date.UTC(2025, 11, 31, 23, 59 - index, 0))
      }))
    ]);

    return {
      app,
      bob,
      carol,
      tieLow,
      tieHigh
    };
  }

  test('returns the 30 newest followed-user tweets without a token or password hashes', async () => {
    const { app, bob, carol, tieLow, tieHigh } = await createFeedFixture();

    const response = await app.inject({
      method: 'GET',
      url: `/users/${bob.username}/feed/tweets`
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json<FeedTweetsResponse>();
    expect(payload.tweets).toHaveLength(30);
    expect(payload.hasMore).toBe(true);
    expect(payload.nextCursor).toEqual(expect.any(String));
    expect(payload.tweets[0]).toMatchObject({
      id: tieHigh.id,
      text: tieHigh.text,
      author: {
        id: carol.id,
        username: carol.username,
        firstName: 'Carol',
        lastName: null
      }
    });
    expect(payload.tweets[1]).toMatchObject({
      id: tieLow.id,
      text: tieLow.text
    });

    const texts = payload.tweets.map((tweet) => tweet.text);
    expect(texts).not.toContain('bob own newer tweet');
    expect(texts).not.toContain('eve unfollowed newer tweet');
    expect(texts).not.toContain('followed older 28');
    expect(JSON.stringify(payload)).not.toContain('password');
  });

  test('returns the next page for a valid cursor', async () => {
    const { app, bob } = await createFeedFixture();

    const firstResponse = await app.inject({
      method: 'GET',
      url: `/users/${bob.username}/feed/tweets?limit=10`
    });
    const firstPage = firstResponse.json<FeedTweetsResponse>();

    const secondResponse = await app.inject({
      method: 'GET',
      url: `/users/${bob.username}/feed/tweets?limit=10&cursor=${encodeURIComponent(
        firstPage.nextCursor ?? ''
      )}`
    });

    expect(secondResponse.statusCode).toBe(200);
    const secondPage = secondResponse.json<FeedTweetsResponse>();
    expect(secondPage.tweets).toHaveLength(10);
    expect(secondPage.hasMore).toBe(true);
    expect(secondPage.nextCursor).toEqual(expect.any(String));
    expect(secondPage.tweets[0]?.text).toBe('followed older 8');
    expect(secondPage.tweets.map((tweet) => tweet.id)).not.toContain(firstPage.tweets[0]?.id);
  });

  test('returns the final page without a cursor when there are no more tweets', async () => {
    const { app, bob } = await createFeedFixture();
    let cursor: string | null = null;
    let finalPage: FeedTweetsResponse = {
      tweets: [],
      nextCursor: null,
      hasMore: false
    };

    for (let page = 0; page < 4; page += 1) {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${bob.username}/feed/tweets?limit=10${
          cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
        }`
      });

      finalPage = response.json<FeedTweetsResponse>();
      cursor = finalPage.nextCursor;
    }

    expect(finalPage?.tweets).toHaveLength(3);
    expect(finalPage?.hasMore).toBe(false);
    expect(finalPage?.nextCursor).toBeNull();
  });

  test('rejects invalid pagination query values', async () => {
    const { app, bob } = await createFeedFixture();

    const invalidLimit = await app.inject({
      method: 'GET',
      url: `/users/${bob.username}/feed/tweets?limit=31`
    });
    const invalidCursor = await app.inject({
      method: 'GET',
      url: `/users/${bob.username}/feed/tweets?cursor=not-a-cursor`
    });

    expect(invalidLimit.statusCode).toBe(400);
    expect(invalidCursor.statusCode).toBe(400);
  });

  test('returns 404 without a token when the requested username does not exist', async () => {
    const { db, pool } = createDatabase();
    pools.push(pool);
    const app = await buildApp({ db });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/users/missing-user/feed/tweets'
    });

    expect(response.statusCode).toBe(404);
  });
});
