import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  resolveAuthorizedEmail,
  normalizeEmail,
  displayNameForEmail,
  avatarUrlForEmail,
  validatePassword,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { loadApiEnv } from '../config/env.js';
import {
  createSessionToken,
  hashEmail,
  hashPassword,
  hashToken,
  verifyPassword,
} from './auth.crypto.js';

const LOGIN_WINDOW_MS = 10 * 60_000;
const LOGIN_MAX = 8;
const loginHits = new Map<string, { count: number; resetAt: number }>();

const GENERIC_LOGIN_ERROR = 'Identifiants incorrects.';

@Injectable()
export class AuthService {
  private dummyHashPromise: Promise<string> | null = null;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private dummyHash(): Promise<string> {
    const env = loadApiEnv();
    this.dummyHashPromise ??= hashPassword('not-a-real-user-placeholder', env.PASSWORD_PEPPER);
    return this.dummyHashPromise;
  }

  private assertLoginThrottle(ip: string, email: string) {
    const key = `${ip}:${hashEmail(email)}`;
    const now = Date.now();
    const current = loginHits.get(key);
    if (!current || current.resetAt < now) {
      loginHits.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
      return;
    }
    current.count += 1;
    if (current.count > LOGIN_MAX) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
  }

  async login(input: { email: string; password: string; ip: string }) {
    this.assertLoginThrottle(input.ip, input.email);
    const env = loadApiEnv();
    const email = resolveAuthorizedEmail(input.email);
    if (!email) {
      await verifyPassword(await this.dummyHash(), input.password, env.PASSWORD_PEPPER);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    const hash = user?.passwordHash ?? (await this.dummyHash());
    const ok = await verifyPassword(hash, input.password, env.PASSWORD_PEPPER);
    if (!user || !user.passwordHash || !ok) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    return this.issueSession(user);
  }

  async loginWithGoogle(input: { email: string; emailVerified: boolean; googleSub: string }) {
    const email = resolveAuthorizedEmail(input.email);
    if (!input.emailVerified || !email) {
      // Le client ne recoit qu'un message generique : la raison reste dans les logs.
      console.warn('google refuse', {
        email: normalizeEmail(input.email),
        emailVerifie: input.emailVerified,
        autorise: email !== null,
      });
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    const user = await this.prisma.user.upsert({
      where: { email },
      update: { googleSub: input.googleSub },
      create: {
        email,
        displayName: displayNameForEmail(email),
        googleSub: input.googleSub,
      },
    });
    return this.issueSession(user);
  }

  async resolveSession(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expirée.');
    }
    return {
      userId: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      avatarUrl: avatarUrlForEmail(session.user.email),
      sessionId: session.id,
    };
  }

  async revokeSession(token: string) {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, nextPassword: string) {
    const env = loadApiEnv();
    const check = validatePassword(nextPassword);
    if (!check.ok) {
      throw new ForbiddenException(check.message);
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new ForbiddenException('Changement de mot de passe impossible.');
    }
    const ok = await verifyPassword(user.passwordHash, currentPassword, env.PASSWORD_PEPPER);
    if (!ok) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await hashPassword(nextPassword, env.PASSWORD_PEPPER),
          passwordChangedAt: new Date(),
        },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Session invalide.');
    return this.publicUser(user);
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, displayName: true },
      orderBy: { displayName: 'asc' },
    });
    return users.map((user) => this.publicUser(user));
  }

  private publicUser(user: { id: string; email: string; displayName: string }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: avatarUrlForEmail(user.email),
    };
  }

  private async issueSession(user: { id: string; email: string; displayName: string }) {
    const env = loadApiEnv();
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60_000);
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        familyId: createSessionToken(),
        expiresAt,
      },
    });
    return { token, expiresAt, user: this.publicUser(user) };
  }
}
