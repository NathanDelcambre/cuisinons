import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { InternalKeyGuard } from './internal-key.guard.js';
import { InternalJwtGuard } from './internal-jwt.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthUser } from './internal-jwt.guard.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

const googleSchema = z.object({
  email: z.string().email(),
  emailVerified: z.boolean(),
  googleSub: z.string().min(1),
});

const sessionSchema = z.object({
  token: z.string().min(10),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  nextPassword: z.string().min(1),
});

@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('/internal/auth/login')
  @UseGuards(InternalKeyGuard)
  login(@Body() body: unknown, @Req() req: Request) {
    const input = loginSchema.parse(body);
    const ip = req.ip ?? 'unknown';
    return this.auth.login({ ...input, ip });
  }

  @Post('/internal/auth/google')
  @UseGuards(InternalKeyGuard)
  google(@Body() body: unknown) {
    return this.auth.loginWithGoogle(googleSchema.parse(body));
  }

  @Post('/internal/auth/session/resolve')
  @UseGuards(InternalKeyGuard)
  resolve(@Body() body: unknown) {
    return this.auth.resolveSession(sessionSchema.parse(body).token);
  }

  @Post('/internal/auth/session/revoke')
  @UseGuards(InternalKeyGuard)
  revoke(@Body() body: unknown) {
    return this.auth.revokeSession(sessionSchema.parse(body).token);
  }

  @Post('/internal/auth/password')
  @UseGuards(InternalJwtGuard)
  changePassword(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = passwordSchema.parse(body);
    return this.auth.changePassword(user.id, input.currentPassword, input.nextPassword);
  }

  @Get('/me')
  @UseGuards(InternalJwtGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Get('/users')
  @UseGuards(InternalJwtGuard)
  users() {
    return this.auth.listUsers();
  }
}
