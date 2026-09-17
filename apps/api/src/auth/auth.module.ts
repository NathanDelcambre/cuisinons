import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalJwtGuard } from './internal-jwt.guard';
import { InternalKeyGuard } from './internal-key.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, InternalJwtGuard, InternalKeyGuard],
  exports: [AuthService, InternalJwtGuard],
})
export class AuthModule {}
