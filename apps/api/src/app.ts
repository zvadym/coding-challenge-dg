import './env';
import { Buffer } from 'node:buffer';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { feedTweetsResponseSchema, healthResponseSchema } from '@dgchallenge/shared';
import { fakeJwtGuard } from './auth/fakeJwt';
import { createDatabase, type Database } from './db/client';
import { followers, tweets, users } from './db/schema';

export type BuildAppOptions = {
  logger?: boolean;
  webOrigin?: string;
  db?: Database;
};

type FeedCursor = {
  createdAt: Date;
  id: number;
};

type FeedTweetsQuery = {
  limit?: string;
  cursor?: string;
};

const defaultFeedLimit = 30;
const maxFeedLimit = 30;

function encodeFeedCursor(tweet: { createdAt: Date; id: number }): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: tweet.createdAt.toISOString(),
      id: tweet.id
    }),
    'utf8'
  ).toString('base64url');
}

function decodeFeedCursor(cursor: string): FeedCursor | null {
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('createdAt' in payload) ||
      !('id' in payload) ||
      typeof payload.createdAt !== 'string' ||
      typeof payload.id !== 'number' ||
      !Number.isInteger(payload.id) ||
      payload.id <= 0
    ) {
      return null;
    }

    const createdAt = new Date(payload.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return {
      createdAt,
      id: payload.id
    };
  } catch {
    return null;
  }
}

function parseFeedLimit(limit: string | undefined): number | null {
  if (limit === undefined) {
    return defaultFeedLimit;
  }

  const parsed = Number(limit);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxFeedLimit) {
    return null;
  }

  return parsed;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false
  });
  let ownedDatabase: ReturnType<typeof createDatabase> | undefined;

  function getDatabase(): Database {
    if (options.db) {
      return options.db;
    }

    ownedDatabase ??= createDatabase();

    return ownedDatabase.db;
  }

  app.addHook('onClose', async () => {
    await ownedDatabase?.pool.end();
  });

  await app.register(cors, {
    origin: options.webOrigin ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000'
  });

  app.get('/health', async () => {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api'
    });
  });

  app.get<{ Params: { username: string }; Querystring: FeedTweetsQuery }>(
    '/users/:username/feed/tweets',
    {
      preHandler: fakeJwtGuard
    },
    async (request, reply) => {
      const limit = parseFeedLimit(request.query.limit);

      if (limit === null) {
        return reply.code(400).send({
          error: `limit must be an integer between 1 and ${maxFeedLimit}`
        });
      }

      const cursor = request.query.cursor ? decodeFeedCursor(request.query.cursor) : null;

      if (request.query.cursor && cursor === null) {
        return reply.code(400).send({
          error: 'cursor is invalid'
        });
      }

      const db = getDatabase();
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, request.params.username))
        .limit(1);

      if (!user) {
        return reply.code(404).send({
          error: 'User not found'
        });
      }

      const followerFilter = eq(followers.followerId, user.id);
      const cursorFilter = cursor
        ? or(
            lt(tweets.createdAt, cursor.createdAt),
            and(eq(tweets.createdAt, cursor.createdAt), lt(tweets.id, cursor.id))
          )
        : undefined;
      const whereFilter = cursorFilter ? and(followerFilter, cursorFilter) : followerFilter;
      const rows = await db
        .select({
          id: tweets.id,
          text: tweets.text,
          createdAt: tweets.createdAt,
          author: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(followers)
        .innerJoin(tweets, eq(tweets.authorId, followers.followingId))
        .innerJoin(users, eq(users.id, tweets.authorId))
        .where(whereFilter)
        .orderBy(desc(tweets.createdAt), desc(tweets.id))
        .limit(limit + 1);

      const pageRows = rows.slice(0, limit);
      const hasMore = rows.length > limit;
      const lastTweet = pageRows.at(-1);

      return feedTweetsResponseSchema.parse({
        tweets: pageRows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString()
        })),
        nextCursor: hasMore && lastTweet ? encodeFeedCursor(lastTweet) : null,
        hasMore
      });
    }
  );

  return app;
}
