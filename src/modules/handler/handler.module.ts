import { Module } from '@nestjs/common';
import { HandlerController } from './handler.controller';
import { HandlerService } from './handler.service';
import { HandlerHelper } from './handler.helper';

@Module({
    controllers: [HandlerController],
    providers: [HandlerService, HandlerHelper],
})
export class HandlerModule {}
