import './env';
import { desc, eq } from 'drizzle-orm';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { feedTweetsResponseSchema, healthResponseSchema } from '@dgchallenge/shared';
import { createDatabase, type Database } from './db/client';
import { followers, tweets, users } from './db/schema';

export type BuildAppOptions = {
  logger?: boolean;
  webOrigin?: string;
  db?: Database;
};

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

  app.get<{ Params: { username: string } }>(
    '/users/:username/feed/tweets',
    async (request, reply) => {
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
        .where(eq(followers.followerId, user.id))
        .orderBy(desc(tweets.createdAt), desc(tweets.id))
        .limit(30);

      return feedTweetsResponseSchema.parse({
        tweets: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString()
        }))
      });
    }
  );

  return app;
}
