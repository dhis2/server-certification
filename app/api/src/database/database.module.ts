import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        type: 'postgres',
        host: configService.get('database.host', { infer: true }),
        port: configService.get('database.port', { infer: true }),
        username: configService.get('database.username', { infer: true }),
        password: configService.get('database.password', { infer: true }),
        database: configService.get('database.name', { infer: true }),
        ssl: configService.get('database.ssl', { infer: true })
          ? {
              rejectUnauthorized:
                configService.get('nodeEnv', { infer: true }) === 'production',
            }
          : false,
        autoLoadEntities: true,
        synchronize:
          configService.get('nodeEnv', { infer: true }) === 'development',
        logging:
          configService.get('nodeEnv', { infer: true }) === 'development',
        migrations: ['dist/database/migrations/*.js'],
        migrationsTableName: 'migrations',
      }),
    }),
  ],
})
export class DatabaseModule {}
