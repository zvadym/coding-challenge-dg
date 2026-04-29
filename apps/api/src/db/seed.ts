import { and, inArray } from 'drizzle-orm';
import { createDatabase, type Database } from './client';
import { followers, tweets, users } from './schema';

type SeedUser = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
};

const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$seed-hash';

const seedUsers = {
  bob: {
    username: 'bob',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Rivers',
    age: 34
  },
  alice: {
    username: 'alice',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Chen',
    age: 31
  },
  carol: {
    username: 'carol',
    email: 'carol@example.com',
    firstName: 'Carol',
    lastName: 'Stone',
    age: 29
  },
  dana: {
    username: 'dana',
    email: 'dana@example.com',
    firstName: 'Dana',
    lastName: 'Lee',
    age: 37
  }
} satisfies Record<string, SeedUser>;

const seedTweetTexts = [
  'Shipping a small feature feels better when the API contract is boring and explicit.',
  'Cursor pagination is one of those details users only notice when it breaks.',
  'A quiet interface can still feel considered when the spacing and hierarchy do the work.',
  'The best loading state is short, specific, and honest about what is happening.',
  'Data readability wins: name, handle, timestamp, content, then get out of the way.',
  'Long text should wrap predictably because real users never respect mockup lengths.',
  'Pagination buttons need disabled states as much as they need click handlers.',
  'A feed without empty and error states is only finished for the happy path.',
  'Good local seed data turns frontend review from setup work into product feedback.',
  'Tie-breaking by ID keeps feeds stable when several posts share the same timestamp.',
  'Runtime schema validation is useful at app boundaries, especially in small monorepos.',
  'Every demo dataset should have enough rows to prove the second page works.',
  'A clear retry button beats a vague error banner every time.',
  'The URL should remember view state so refresh does not punish exploration.',
  'Timestamps are presentation details, so let Intl format them for the reader.',
  'A compact card list is often better than a busy dashboard for chronological content.',
  'Keyboard focus styles are part of the interface, not a QA afterthought.',
  'The frontend should not guess whether more data exists; the API should say so.',
  'Readable defaults make the first run matter.',
  'Small challenge projects still deserve real edge states.',
  'Following users should produce a feed; your own posts should stay out of it.',
  'A stable cursor is a tiny protocol between the list and the database order.',
  'Whitespace can be functional when it separates metadata from content.',
  'Good sample content teaches future contributors what the screen is for.',
  'API errors should tell the UI what happened without leaking internals.',
  'The load-more pattern is simple, testable, and accessible.',
  'A sorted feed needs a deterministic secondary key.',
  'Design polish starts with alignment and ends with state coverage.',
  'A seed command should be explicit, repeatable, and safe to run twice.',
  'A frontend that handles no tweets is more complete than one with perfect mock data.',
  'The database is part of the user experience when the screen depends on real rows.',
  'Simple pages still benefit from semantic landmarks.',
  'The content column should stay narrow enough for scanning.',
  'Status copy should describe the current state, not the implementation.',
  'A retry path is the difference between a dead end and a recoverable problem.',
  'A working demo feed is the fastest way to inspect the whole stack.'
];

async function upsertSeedUser(db: Database, user: SeedUser): Promise<{ id: number }> {
  const [inserted] = await db
    .insert(users)
    .values({
      ...user,
      passwordHash,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        updatedAt: new Date()
      }
    })
    .returning({ id: users.id });

  return inserted;
}

export async function seedBobFeed(db: Database): Promise<void> {
  const bob = await upsertSeedUser(db, seedUsers.bob);
  const authors = await Promise.all([
    upsertSeedUser(db, seedUsers.alice),
    upsertSeedUser(db, seedUsers.carol),
    upsertSeedUser(db, seedUsers.dana)
  ]);
  const authorIds = authors.map((author) => author.id);

  await db
    .delete(tweets)
    .where(and(inArray(tweets.authorId, authorIds), inArray(tweets.text, seedTweetTexts)));

  await db
    .insert(followers)
    .values(authors.map((author) => ({ followerId: bob.id, followingId: author.id })))
    .onConflictDoNothing({
      target: [followers.followerId, followers.followingId]
    });

  await db.insert(tweets).values(
    seedTweetTexts.map((text, index) => ({
      authorId: authorIds[index % authorIds.length],
      text,
      createdAt: new Date(Date.UTC(2026, 3, 29, 12, seedTweetTexts.length - index, 0)),
      updatedAt: new Date(Date.UTC(2026, 3, 29, 12, seedTweetTexts.length - index, 0))
    }))
  );
}

if (import.meta.main) {
  const { db, pool } = createDatabase();

  try {
    await seedBobFeed(db);
    console.log(`Seeded Bob's feed with ${seedTweetTexts.length} tweets.`);
  } finally {
    await pool.end();
  }
}
