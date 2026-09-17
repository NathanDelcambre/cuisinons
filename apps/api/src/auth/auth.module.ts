import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { InternalJwtGuard } from './internal-jwt.guard.js';
import { InternalKeyGuard } from './internal-key.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, InternalJwtGuard, InternalKeyGuard],
  exports: [AuthService, InternalJwtGuard],
})
export class AuthModule {}
