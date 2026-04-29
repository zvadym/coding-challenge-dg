import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const healthChecks = pgTable('health_checks', {
  id: serial('id').primaryKey(),
  service: varchar('service', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
