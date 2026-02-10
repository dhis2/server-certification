import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImplementationsController } from './implementations.controller';
import { ImplementationsService } from './services/implementations.service';
import { Implementation } from './entities/implementation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Implementation])],
  controllers: [ImplementationsController],
  providers: [ImplementationsService],
  exports: [ImplementationsService],
})
export class ImplementationsModule {}
