# coding-challenge-dg

Interview coding challenge

- `apps/api`: Fastify API with Drizzle ORM and PostgreSQL.
- `apps/web`: Next.js App Router frontend.
- `packages/shared`: shared TypeScript/Zod contracts.

## Requirements

- Bun
- Docker

## Setup

```sh
bun install
cp .env.example .env
docker compose up -d db
bun run db:migrate
bun run db:seed
```

## Development

```sh
bun run dev:api
bun run dev:web
```

The API runs on `http://localhost:4000`.
The web app runs on `http://localhost:3000`.

The seed command creates Bob and sample followed-user tweets for the frontend feed.

## Checks

```sh
bun run lint
bun run format:check
bun run typecheck
bun run test
bun run build
```

## Database

Drizzle schema lives in `apps/api/src/db/schema.ts`.
SQL migrations live in `apps/api/drizzle`.

```sh
bun run db:generate
bun run db:migrate
```
