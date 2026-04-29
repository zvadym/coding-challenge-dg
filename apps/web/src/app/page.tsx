import { BobFeed } from './bob-feed';

export default function Home() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-[var(--foreground)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to Feed
      </a>
      <main
        id="main-content"
        className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10"
      >
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            DG Challenge
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-pretty sm:text-5xl">
            A focused feed for Bob’s follows
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
            Read the latest posts from the people Bob follows, then load older tweets when you need
            more context.
          </p>
        </header>

        <BobFeed />
      </main>
    </>
  );
}
