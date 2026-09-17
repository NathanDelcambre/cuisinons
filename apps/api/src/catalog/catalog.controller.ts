import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { InternalJwtGuard } from '../auth/internal-jwt.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller()
@UseGuards(InternalJwtGuard)
export class CatalogController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('/tags')
  tags() {
    return this.prisma.tag.findMany({ orderBy: { label: 'asc' } });
  }

  @Get('/equipment')
  equipment() {
    return this.prisma.equipment.findMany({ orderBy: { label: 'asc' } });
  }
}
