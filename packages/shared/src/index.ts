import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('api')
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const feedTweetSchema = z.object({
  id: z.number().int().positive(),
  text: z.string(),
  createdAt: z.string().datetime(),
  author: z.object({
    id: z.number().int().positive(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable()
  })
});

export const feedTweetsResponseSchema = z.object({
  tweets: z.array(feedTweetSchema)
});

export type FeedTweet = z.infer<typeof feedTweetSchema>;
export type FeedTweetsResponse = z.infer<typeof feedTweetsResponseSchema>;
