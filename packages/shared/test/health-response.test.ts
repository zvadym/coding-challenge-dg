import { describe, expect, test } from 'bun:test';
import { feedTweetsResponseSchema, healthResponseSchema } from '../src';

describe('healthResponseSchema', () => {
  test('accepts the API health response contract', () => {
    expect(
      healthResponseSchema.parse({
        status: 'ok',
        service: 'api'
      })
    ).toEqual({
      status: 'ok',
      service: 'api'
    });
  });
});

describe('feedTweetsResponseSchema', () => {
  test('accepts the followed tweets feed response contract', () => {
    expect(
      feedTweetsResponseSchema.parse({
        tweets: [
          {
            id: 1,
            text: 'Hello.',
            createdAt: '2026-01-01T00:00:00.000Z',
            author: {
              id: 2,
              username: 'alice',
              firstName: 'Alice',
              lastName: null
            }
          }
        ]
      })
    ).toEqual({
      tweets: [
        {
          id: 1,
          text: 'Hello.',
          createdAt: '2026-01-01T00:00:00.000Z',
          author: {
            id: 2,
            username: 'alice',
            firstName: 'Alice',
            lastName: null
          }
        }
      ]
    });
  });
});
