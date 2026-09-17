import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { jwtVerify } from 'jose';
import { loadApiEnv } from '../config/env.js';

export type AuthUser = {
  id: string;
  email: string;
};

@Injectable()
export class InternalJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentification requise.');
    }
    const token = header.slice('Bearer '.length).trim();
    const env = loadApiEnv();
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(env.INTERNAL_API_SECRET), {
        issuer: 'cuisinons-web',
        audience: 'cuisinons-api',
      });
      const userId = typeof payload.sub === 'string' ? payload.sub : null;
      const email = typeof payload.email === 'string' ? payload.email : null;
      if (!userId || !email) {
        throw new UnauthorizedException('Jeton interne invalide.');
      }
      req.user = { id: userId, email };
      return true;
    } catch {
      throw new UnauthorizedException('Jeton interne invalide.');
    }
  }
}
