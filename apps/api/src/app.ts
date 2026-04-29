import './env';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { healthResponseSchema } from '@dgchallenge/shared';

export type BuildAppOptions = {
  logger?: boolean;
  webOrigin?: string;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false
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

  return app;
}
