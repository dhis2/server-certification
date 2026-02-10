import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { Public } from 'src/modules/iam/authentication/decorators/public.decorator';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'ok' | 'error';
      message?: string;
    };
  };
}

@Public()
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const dbCheck = await this.checkDatabase();

    const status: HealthStatus = {
      status: dbCheck.status === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {
        database: dbCheck,
      },
    };

    return status;
  }

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{
    status: 'ok' | 'error';
    message?: string | undefined;
  }> {
    const dbCheck = await this.checkDatabase();
    if (dbCheck.status === 'error') {
      return { status: 'error', message: dbCheck.message };
    }
    return { status: 'ok' };
  }

  private async checkDatabase(): Promise<{
    status: 'ok' | 'error';
    message?: string;
  }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database connection failed';
      return { status: 'error', message };
    }
  }
}
