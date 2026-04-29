import { afterEach, describe, expect, test } from 'bun:test';
import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@dgchallenge/shared';
import { buildApp } from '../src/app';

const apps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()));
  apps.length = 0;
});

describe('GET /health', () => {
  test('returns API health status', async () => {
    const app = await buildApp();
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json<HealthResponse>();
    expect(payload.status).toBe('ok');
    expect(payload.service).toBe('api');
  });
});
