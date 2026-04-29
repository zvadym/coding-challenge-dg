import { healthResponseSchema, type HealthResponse } from '@dgchallenge/shared';

const DEFAULT_API_URL = 'http://localhost:4000';

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
