import {
  feedTweetsResponseSchema,
  healthResponseSchema,
  type FeedTweetsResponse,
  type HealthResponse
} from '@dgchallenge/shared';

const DEFAULT_API_URL = 'http://localhost:4000';

export type FeedApiErrorCode = 'invalid-request' | 'not-found' | 'unavailable';

export class FeedApiError extends Error {
  constructor(
    message: string,
    public readonly code: FeedApiErrorCode,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'FeedApiError';
  }
}

export async function getApiHealth(): Promise<HealthResponse | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;

  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    return healthResponseSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export async function getUserFeedTweets({
  username,
  limit,
  cursor,
  signal
}: {
  username: string;
  limit: number;
  cursor?: string | null;
  signal?: AbortSignal;
}): Promise<FeedTweetsResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
  const url = new URL(`/users/${encodeURIComponent(username)}/feed/tweets`, apiUrl);

  url.searchParams.set('limit', String(limit));

  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

  const response = await fetch(url, {
    cache: 'no-store',
    signal
  });

  if (response.status === 404) {
    throw new FeedApiError(
      'Bob was not found. Run the seed command and try again.',
      'not-found',
      404
    );
  }

  if (response.status === 400) {
    throw new FeedApiError(
      'The feed request was invalid. Refresh the page and try again.',
      'invalid-request',
      400
    );
  }

  if (!response.ok) {
    throw new FeedApiError(
      'The API did not return the feed. Check that it is running.',
      'unavailable',
      response.status
    );
  }

  return feedTweetsResponseSchema.parse(await response.json());
}
