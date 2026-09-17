import { Module } from '@nestjs/common';
import { ProvisionsController } from './provisions.controller.js';
import { ProvisionsService } from './provisions.service.js';

@Module({
  controllers: [ProvisionsController],
  providers: [ProvisionsService],
})
export class ProvisionsModule {}
