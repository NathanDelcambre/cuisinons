import { SignJWT } from 'jose';
import { loadWebEnv } from '../env';

export async function mintInternalJwt(input: { userId: string; email: string }): Promise<string> {
  const env = loadWebEnv();
  return new SignJWT({ email: input.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.userId)
    .setIssuer('cuisinons-web')
    .setAudience('cuisinons-api')
    .setIssuedAt()
    .setExpirationTime(`${String(env.INTERNAL_JWT_TTL_SECONDS)}s`)
    .sign(new TextEncoder().encode(env.INTERNAL_API_SECRET));
}
