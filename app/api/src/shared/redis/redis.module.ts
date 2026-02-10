import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import redisConfig from './redis.config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
