jest.mock('bcrypt', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockResolvedValue(true),
  },
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { StatusListController } from '../status-list.controller';
import type {
  StatusListService,
  BitstringStatusListCredential,
} from '../services/status-list.service';
import type { StatusListCacheService } from '../services/status-list-cache.service';

describe('StatusListController', () => {
  let controller: StatusListController;
  let mockStatusListService: Partial<StatusListService>;
  let mockCacheService: Partial<StatusListCacheService>;
  let mockResponse: Partial<Response>;

  const mockStatusListCredential: BitstringStatusListCredential = {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: 'https://certification.dhis2.org/status-list/2026',
    type: ['VerifiableCredential', 'BitstringStatusListCredential'],
    issuer: 'did:web:certification.dhis2.org',
    validFrom: '2026-01-01T00:00:00Z',
    credentialSubject: {
      id: 'https://certification.dhis2.org/status-list/2026#list',
      type: 'BitstringStatusList',
      statusPurpose: 'revocation',
      encodedList: 'H4sIAAAAAAAAA...',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockStatusListService = {
      generateStatusList: jest.fn().mockResolvedValue(mockStatusListCredential),
    };

    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('"etag123"'),
      validateETag: jest.fn().mockResolvedValue(false),
      getCacheTtl: jest.fn().mockReturnValue(300),
      invalidate: jest.fn().mockResolvedValue(undefined),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };

    controller = new StatusListController(
      mockStatusListService as StatusListService,
      mockCacheService as StatusListCacheService,
    );
  });

  describe('getStatusList', () => {
    it('should return status list credential for valid year', async () => {
      await controller.getStatusList(2026, undefined, mockResponse as Response);

      expect(mockCacheService.get).toHaveBeenCalledWith(2026);
      expect(mockStatusListService.generateStatusList).toHaveBeenCalledWith(
        2026,
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        2026,
        mockStatusListCredential,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockStatusListCredential);
    });

    it('should return cached credential when available', async () => {
      jest.mocked(mockCacheService.get!).mockResolvedValue({
        credential: mockStatusListCredential,
        etag: '"cached-etag"',
      });

      await controller.getStatusList(2026, undefined, mockResponse as Response);

      expect(mockCacheService.get).toHaveBeenCalledWith(2026);
      expect(mockStatusListService.generateStatusList).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockStatusListCredential);
    });

    it('should return 304 when ETag matches', async () => {
      jest.mocked(mockCacheService.validateETag!).mockResolvedValue(true);

      await controller.getStatusList(
        2026,
        '"etag123"',
        mockResponse as Response,
      );

      expect(mockCacheService.validateETag).toHaveBeenCalledWith(
        2026,
        '"etag123"',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(304);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockStatusListService.generateStatusList).not.toHaveBeenCalled();
    });

    it('should accept current year', async () => {
      const currentYear = new Date().getFullYear();
      await controller.getStatusList(
        currentYear,
        undefined,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockStatusListCredential);
    });

    it('should accept next year (future planning)', async () => {
      const nextYear = new Date().getFullYear() + 1;
      await controller.getStatusList(
        nextYear,
        undefined,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockStatusListCredential);
    });

    it('should throw NotFoundException for year too far in the past', async () => {
      await expect(
        controller.getStatusList(2020, undefined, mockResponse as Response),
      ).rejects.toThrow(NotFoundException);
      expect(mockStatusListService.generateStatusList).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for year too far in the future', async () => {
      const futureYear = new Date().getFullYear() + 10;
      await expect(
        controller.getStatusList(
          futureYear,
          undefined,
          mockResponse as Response,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockStatusListService.generateStatusList).not.toHaveBeenCalled();
    });

    it('should set proper cache headers', async () => {
      await controller.getStatusList(2026, undefined, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vc+ld+json',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('ETag', '"etag123"');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Vary',
        'Accept-Encoding',
      );
    });
  });
});
