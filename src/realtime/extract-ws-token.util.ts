import type { Socket } from 'socket.io';

export function extractWsToken(client: Socket): string | null {
  const headers = client.handshake?.headers as
    | Record<string, string>
    | undefined;

  const authHeader = headers?.authorization || headers?.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const tokenFromAuth = client.handshake?.auth?.token as string | undefined;
  if (tokenFromAuth) return tokenFromAuth;

  const tokenFromQuery = client.handshake?.query?.token as string | undefined;
  if (tokenFromQuery) return tokenFromQuery;

  return null;
}
