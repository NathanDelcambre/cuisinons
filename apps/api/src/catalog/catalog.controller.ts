import { Controller, Get, UseGuards } from '@nestjs/common';
import { InternalJwtGuard } from '../auth/internal-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
@UseGuards(InternalJwtGuard)
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/tags')
  tags() {
    return this.prisma.tag.findMany({ orderBy: { label: 'asc' } });
  }

  @Get('/equipment')
  equipment() {
    return this.prisma.equipment.findMany({ orderBy: { label: 'asc' } });
  }
}
