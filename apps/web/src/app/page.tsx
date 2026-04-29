import { getApiHealth } from '@/lib/api';

export default async function Home() {
  const health = await getApiHealth();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-3 border-b border-[var(--border)] pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          Interview scaffold
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight">
          Bun monorepo with a Fastify API and Next.js frontend
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
          The repository is ready for feature work: typed contracts, database migrations,
          integration tests, linting, formatting, and CI are already wired.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard label="API" value={health?.status ?? 'unavailable'} />
        <StatusCard label="Service" value={health?.service ?? 'api'} />
        <StatusCard label="Database" value="migrations ready" />
      </section>
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
