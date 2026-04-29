import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TweetCard } from '../src/app/bob-feed';

describe('TweetCard', () => {
  test('renders author details and tweet content', () => {
    const markup = renderToStaticMarkup(
      <TweetCard
        tweet={{
          id: 1,
          text: 'Hello from a long but readable feed item.',
          createdAt: '2026-04-29T12:00:00.000Z',
          author: {
            id: 2,
            username: 'alice',
            firstName: 'Alice',
            lastName: 'Chen'
          }
        }}
      />
    );

    expect(markup).toContain('Alice Chen');
    expect(markup).toContain('@alice');
    expect(markup).toContain('Hello from a long but readable feed item.');
    expect(markup).toContain('dateTime="2026-04-29T12:00:00.000Z"');
  });
});
