import type { FastifyRequest } from 'fastify';

export async function fakeJwtGuard(request: FastifyRequest): Promise<void> {
  void request.headers.authorization;

  // TODO: Verify Bearer JWT here before allowing protected routes.
}
