import { describe, expect, test } from 'bun:test';
import { healthResponseSchema } from '../src';

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
