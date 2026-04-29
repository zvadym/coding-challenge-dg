'use client';

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeedTweet } from '@dgchallenge/shared';
import { FeedApiError, getUserFeedTweets } from '@/lib/api';

const username = 'bob';
const pageSize = 10;
const minimumLoadMoreMs = 1000;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const countFormatter = new Intl.NumberFormat();

type FeedStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'not-found' | 'error';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function authorName(author: FeedTweet['author']): string {
  return [author.firstName, author.lastName].filter(Boolean).join(' ') || `@${author.username}`;
}

export function BobFeed() {
  const requestIdRef = useRef(0);
  const firstNewTweetRef = useRef<HTMLElement | null>(null);

  const [tweets, setTweets] = useState<FeedTweet[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<FeedStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newTweetIds, setNewTweetIds] = useState<Set<number>>(() => new Set());
  const [firstNewTweetId, setFirstNewTweetId] = useState<number | null>(null);

  const statusText = useMemo(() => {
    if (status === 'loading') {
      return 'Loading Bob’s feed…';
    }

    if (status === 'empty') {
      return 'No tweets yet';
    }

    if (status === 'not-found') {
      return 'Bob was not found';
    }

    if (status === 'error') {
      return 'Feed unavailable';
    }

    return `${countFormatter.format(tweets.length)} tweets loaded`;
  }, [status, tweets.length]);

  const loadInitialPage = useCallback(async (signal?: AbortSignal) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus('loading');
    setErrorMessage(null);
    setTweets([]);
    setNextCursor(null);
    setHasMore(false);

    try {
      const response = await getUserFeedTweets({
        username,
        limit: pageSize,
        signal
      });

      if (requestIdRef.current !== requestId || signal?.aborted) {
        return;
      }

      setTweets(response.tweets);
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
      setStatus(response.tweets.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      if (requestIdRef.current !== requestId || signal?.aborted) {
        return;
      }

      if (error instanceof FeedApiError && error.code === 'not-found') {
        setStatus('not-found');
      } else {
        setStatus('error');
      }

      setErrorMessage(error instanceof Error ? error.message : 'The feed could not be loaded.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadInitialPage(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadInitialPage]);

  useEffect(() => {
    if (firstNewTweetId === null) {
      return;
    }

    firstNewTweetRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, [firstNewTweetId, tweets]);

  async function handleLoadMore() {
    if (!hasMore || isLoadingMore || !nextCursor) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);
    setNewTweetIds(new Set());
    setFirstNewTweetId(null);

    try {
      const [feedResult] = await Promise.allSettled([
        getUserFeedTweets({
          username,
          limit: pageSize,
          cursor: nextCursor
        }),
        wait(minimumLoadMoreMs)
      ] as const);

      if (feedResult.status === 'rejected') {
        throw feedResult.reason;
      }

      const response = feedResult.value;
      const loadedTweetIds = response.tweets.map((tweet) => tweet.id);

      setTweets((currentTweets) => [...currentTweets, ...response.tweets]);
      setNewTweetIds(new Set(loadedTweetIds));
      setFirstNewTweetId(loadedTweetIds[0] ?? null);
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
      setStatus(response.tweets.length > 0 || tweets.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'The next page could not be loaded.'
      );
      setStatus(tweets.length > 0 ? 'ready' : 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section aria-labelledby="feed-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Following Feed
          </p>
          <h2 id="feed-heading" className="mt-2 text-3xl font-semibold text-pretty sm:text-4xl">
            Bob’s Feed
          </h2>
        </div>
        <p
          aria-live="polite"
          className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm font-medium text-[var(--muted)] shadow-sm"
        >
          {statusText}
        </p>
      </div>

      {status === 'loading' ? <LoadingList /> : null}

      {status === 'empty' ? (
        <StatePanel
          title="No Tweets Yet"
          message="Bob follows a few authors, but they have not posted anything in this feed."
          onRetry={() => void loadInitialPage()}
        />
      ) : null}

      {status === 'not-found' ? (
        <StatePanel
          title="Bob Was Not Found"
          message={errorMessage ?? 'Run the seed command, then reload the feed.'}
          onRetry={() => void loadInitialPage()}
        />
      ) : null}

      {status === 'error' && tweets.length === 0 ? (
        <StatePanel
          title="Feed Unavailable"
          message={errorMessage ?? 'Check that the API is running, then try again.'}
          onRetry={() => void loadInitialPage()}
        />
      ) : null}

      {tweets.length > 0 ? (
        <div className="flex flex-col gap-3">
          {tweets.map((tweet) => (
            <TweetCard
              key={tweet.id}
              ref={tweet.id === firstNewTweetId ? firstNewTweetRef : undefined}
              tweet={tweet}
              isNew={newTweetIds.has(tweet.id)}
            />
          ))}
        </div>
      ) : null}

      {isLoadingMore ? <LoadMoreLoader /> : null}

      {errorMessage && tweets.length > 0 ? (
        <p aria-live="polite" className="text-sm text-[var(--danger)]">
          {errorMessage}
        </p>
      ) : null}

      {tweets.length > 0 ? (
        <div className="flex justify-center pt-2">
          {hasMore ? (
            <button
              type="button"
              onClick={() => void handleLoadMore()}
              disabled={isLoadingMore}
              className="min-h-11 rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
            >
              {isLoadingMore ? 'Loading More…' : 'Load More'}
            </button>
          ) : (
            <p className="text-sm text-[var(--muted)]">End of feed</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

export const TweetCard = forwardRef<
  HTMLElement,
  {
    tweet: FeedTweet;
    isNew?: boolean;
  }
>(function TweetCard({ tweet, isNew = false }, ref) {
  return (
    <article
      ref={ref}
      className={`scroll-mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm [contain-intrinsic-size:140px] [content-visibility:auto] sm:p-5 ${
        isNew ? 'tweet-card-new' : ''
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[var(--avatar)] text-sm font-bold text-[var(--accent-strong)]"
        >
          {authorName(tweet.author)
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
            <h3 className="truncate text-base font-semibold">{authorName(tweet.author)}</h3>
            <p className="min-w-0 truncate text-sm text-[var(--muted)]" translate="no">
              @{tweet.author.username}
            </p>
            <time
              dateTime={tweet.createdAt}
              className="text-sm text-[var(--muted)] [font-variant-numeric:tabular-nums]"
            >
              {dateFormatter.format(new Date(tweet.createdAt))}
            </time>
          </div>
          <p className="mt-3 break-words text-base leading-7 text-[var(--foreground)]">
            {tweet.text}
          </p>
        </div>
      </div>
    </article>
  );
});

function LoadingList() {
  return (
    <div aria-label="Loading tweets" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm sm:p-5"
        >
          <div className="flex gap-3">
            <div className="size-11 rounded-md bg-[var(--skeleton)]" />
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-4 w-2/5 rounded bg-[var(--skeleton)]" />
              <div className="h-4 w-full rounded bg-[var(--skeleton)]" />
              <div className="h-4 w-4/5 rounded bg-[var(--skeleton)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadMoreLoader() {
  return (
    <div
      aria-live="polite"
      aria-label="Loading more tweets"
      className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center gap-3">
        <div className="size-5 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] [animation:spin_850ms_linear_infinite]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Loading more tweets</p>
          <p className="mt-1 text-sm text-[var(--muted)]">New items will appear in a moment.</p>
        </div>
      </div>
    </div>
  );
}

function StatePanel({
  title,
  message,
  onRetry
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-pretty">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
      >
        Retry Feed
      </button>
    </div>
  );
}
