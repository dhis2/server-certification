import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis';
import { EncryptionService, encryptionConfig } from './crypto';

@Module({
  imports: [RedisModule, ConfigModule.forFeature(encryptionConfig)],
  providers: [EncryptionService],
  exports: [RedisModule, EncryptionService],
})
export class SharedModule {}
