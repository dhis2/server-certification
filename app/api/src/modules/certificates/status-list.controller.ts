import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Headers,
  Res,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../iam/authentication/decorators/public.decorator';
import { StatusListService } from './services/status-list.service';
import { StatusListCacheService } from './services/status-list-cache.service';
import type { BitstringStatusListCredential } from './services/status-list.service';

/**
 * Controller for W3C BitstringStatusList credential endpoints.
 *
 * Implements W3C VC Status List 2021 specification for revocation checking.
 * Uses server-side caching with Redis and client-side caching with ETags.
 *
 * Cache Strategy:
 * - Server-side: Redis cache with configurable TTL (default 5 min)
 * - Client-side: ETag-based validation with Cache-Control headers
 * - Cache invalidation: Immediate on certificate revocation
 *
 * @see https://www.w3.org/TR/vc-status-list/
 */
@Controller('status-list')
@ApiTags('Status List')
export class StatusListController {
  constructor(
    private readonly statusListService: StatusListService,
    private readonly cacheService: StatusListCacheService,
  ) {}

  @Get(':year')
  @Public()
  @ApiOperation({
    summary: 'Get BitstringStatusList credential for a year (public)',
    description:
      'Returns a W3C BitstringStatusList credential containing the revocation status of all certificates issued in the specified year. ' +
      'This is a public endpoint used by verifiers to check certificate revocation status. ' +
      'Supports ETag-based conditional requests for efficient caching.',
  })
  @ApiParam({
    name: 'year',
    type: Number,
    description: 'The year to get the status list for (e.g., 2026)',
    example: 2026,
  })
  @ApiHeader({
    name: 'If-None-Match',
    required: false,
    description: 'ETag from previous response for conditional request',
  })
  @ApiResponse({
    status: 200,
    description: 'BitstringStatusList credential',
    headers: {
      ETag: {
        description: 'Entity tag for cache validation',
        schema: { type: 'string' },
      },
      'Cache-Control': {
        description: 'Caching directives',
        schema: { type: 'string' },
      },
    },
    schema: {
      type: 'object',
      properties: {
        '@context': { type: 'array', items: { type: 'string' } },
        id: { type: 'string' },
        type: { type: 'array', items: { type: 'string' } },
        issuer: { type: 'string' },
        validFrom: { type: 'string' },
        credentialSubject: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            statusPurpose: { type: 'string' },
            encodedList: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 304,
    description: 'Not Modified - client cache is still valid',
  })
  @ApiResponse({
    status: 404,
    description: 'Status list not found for the specified year',
  })
  async getStatusList(
    @Param('year', ParseIntPipe) year: number,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const currentYear = new Date().getFullYear();
    if (year < 2024 || year > currentYear + 1) {
      throw new NotFoundException(
        `Status list not available for year ${String(year)}`,
      );
    }

    if (ifNoneMatch) {
      const isValid = await this.cacheService.validateETag(year, ifNoneMatch);
      if (isValid) {
        res.status(HttpStatus.NOT_MODIFIED).end();
        return;
      }
    }

    let credential: BitstringStatusListCredential;
    let etag: string;

    const cached = await this.cacheService.get(year);
    if (cached) {
      credential = cached.credential;
      etag = cached.etag;
    } else {
      credential = await this.statusListService.generateStatusList(year);
      etag = await this.cacheService.set(year, credential);
    }

    const cacheTtl = this.cacheService.getCacheTtl();
    res.setHeader('Content-Type', 'application/vc+ld+json');
    res.setHeader('ETag', etag);
    res.setHeader(
      'Cache-Control',
      `public, max-age=${cacheTtl.toString()}, stale-while-revalidate=${(cacheTtl * 2).toString()}, stale-if-error=${(cacheTtl * 4).toString()}`,
    );
    res.setHeader('Vary', 'Accept-Encoding');

    res.status(HttpStatus.OK).json(credential);
  }
}
