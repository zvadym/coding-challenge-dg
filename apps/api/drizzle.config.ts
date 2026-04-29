import { defineConfig } from 'drizzle-kit';
import './src/env';
import { defaultDatabaseUrl } from './src/db/client';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl
  }
});
