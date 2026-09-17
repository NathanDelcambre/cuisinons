import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { loadApiEnv } from '../config/env';
import { safeEqualString } from './auth.crypto';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.header('x-internal-key') ?? '';
    const env = loadApiEnv();
    if (!key || !safeEqualString(key, env.INTERNAL_API_SECRET)) {
      throw new UnauthorizedException('Authentification serveur requise.');
    }
    return true;
  }
}
