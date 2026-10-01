import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from './public.decorator';

// Verifies Supabase Auth JWTs. The project signs access tokens with
// asymmetric keys (ES256), so verification uses the public JWKS endpoint —
// no shared secret in this service. If SUPABASE_JWT_SECRET is set, legacy
// HS256 tokens are accepted too.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly reflector = new Reflector();
  private readonly jwks = createRemoteJWKSet(
    new URL((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/auth/v1/.well-known/jwks.json'),
  );
  private readonly issuer = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/auth/v1';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Sign in to continue');

    let payload: Record<string, unknown>;
    try {
      const secret = process.env.SUPABASE_JWT_SECRET;
      const result = secret
        ? await jwtVerify(token, new TextEncoder().encode(secret), { issuer: this.issuer })
        : await jwtVerify(token, this.jwks, { issuer: this.issuer });
      payload = result.payload as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }

    const appMetadata = (payload.app_metadata ?? {}) as { role?: string };
    (req as Request & { user: unknown }).user = {
      id: payload.sub,
      email: payload.email,
      role: appMetadata.role || 'Admin',
    };
    return true;
  }
}
