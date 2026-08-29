import type { Request } from 'express';
import { normalizeDomain } from './normalize-domain';

function isLoopback(address?: string): boolean {
  return Boolean(
    address &&
    (address === '127.0.0.1' ||
      address === '::1' ||
      address.startsWith('::ffff:127.')),
  );
}

export function requestHostname(request: Request): string {
  const forwarded = request.headers['x-forwarded-host'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const candidate =
    isLoopback(request.socket?.remoteAddress) && forwardedValue
      ? forwardedValue.split(',')[0]
      : request.headers.host;

  return normalizeDomain(candidate || '');
}
