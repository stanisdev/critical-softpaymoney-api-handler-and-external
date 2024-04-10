import { Module } from '@nestjs/common';
import { PrimaryController } from './primary.controller';
import { PrimaryService } from './primary.service';

@Module({
    controllers: [PrimaryController],
    providers: [PrimaryService],
})
export class PrimaryModule {}
