import { generateKeyPairSync } from 'crypto';
import { SignJWT, exportJWK } from 'jose';
import { UnauthorizedException } from '@nestjs/common';

import { JwtAuthGuard } from './jwt.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

process.env.SUPABASE_URL = 'https://test.supabase.co';

// The guard builds its JWKS verifier from createRemoteJWKSet; the mock points
// it at a real local verifier over a generated public key, so signature
// verification runs for real.
const holder = { jwk: null as Record<string, unknown> | null };
jest.mock('jose', () => {
  const actual = jest.requireActual('jose') as Record<string, any>;
  return {
    ...actual,
    createRemoteJWKSet: () => actual.createLocalJWKSet({ keys: [(globalThis as any).__testJwk] }),
  };
});

const ISSUER = 'https://test.supabase.co' + '/auth/v1';

async function makeContext(authHeader?: string, isPublic = false) {
  const handler = (): void => undefined;
  if (isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
  return {
    req,
    ctx: {
      getHandler: () => handler,
      getClass: () => function TestClass() {},
      switchToHttp: () => ({ getRequest: () => req }),
    } as any,
  };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let privateKey: any;

  beforeAll(async () => {
    const { publicKey, privateKey: priv } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    privateKey = priv;
    holder.jwk = await exportJWK(publicKey);
    holder.jwk.kid = 'test-key';
    holder.jwk.alg = 'ES256';
    (globalThis as any).__testJwk = holder.jwk;
  });

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('lets public endpoints through without a token', async () => {
    const { ctx } = await makeContext(undefined, true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects a missing token with the sign-in message', async () => {
    const { ctx } = await makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow('Sign in to continue');
  });

  it('rejects a non-Bearer header', async () => {
    const { ctx } = await makeContext('Basic dXNlcjpwYXNz');
    await expect(guard.canActivate(ctx)).rejects.toThrow('Sign in to continue');
  });

  it('rejects garbage tokens', async () => {
    const { ctx } = await makeContext('Bearer garbage.token.here');
    await expect(guard.canActivate(ctx)).rejects.toThrow('Your session has expired. Sign in again.');
  });

  it('verifies a valid ES256 token, checks the issuer and attaches the user', async () => {
    const token = await new SignJWT({ email: 'staff@school.kh', app_metadata: { role: 'Accountant' } })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setSubject('user-123')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const { req, ctx } = await makeContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'user-123', email: 'staff@school.kh', role: 'Accountant' });
  });

  it('defaults the role to Admin when app_metadata has no role', async () => {
    const token = await new SignJWT({ email: 'x@school.kh' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const { req, ctx } = await makeContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((req as any).user.role).toBe('Admin');
  });

  it('rejects a token with the wrong issuer', async () => {
    const token = await new SignJWT({ email: 'x@school.kh' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer('https://evil.example.com/auth/v1')
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const { ctx } = await makeContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token signed with a different key', async () => {
    const { privateKey: otherKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const token = await new SignJWT({ email: 'x@school.kh' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(otherKey);

    const { ctx } = await makeContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('accepts a legacy HS256 token when SUPABASE_JWT_SECRET is set', async () => {
    process.env.SUPABASE_JWT_SECRET = 'a-legacy-secret';
    const fresh = new JwtAuthGuard();
    const token = await new SignJWT({ email: 'x@school.kh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setSubject('user-hs')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-legacy-secret'));

    const { req, ctx } = await makeContext(`Bearer ${token}`);
    await expect(fresh.canActivate(ctx)).resolves.toBe(true);
    expect((req as any).user.role).toBe('Admin');
    delete process.env.SUPABASE_JWT_SECRET;
  });
});
