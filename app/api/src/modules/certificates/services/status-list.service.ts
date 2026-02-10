import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as zlib from 'node:zlib';
import { promisify } from 'node:util';
import { Certificate } from '../entities/certificate.entity';
import type { AppConfig } from '../../../config/configuration';

const gzip = promisify(zlib.gzip);

export interface BitstringStatusListCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  validFrom: string;
  credentialSubject: {
    id: string;
    type: string;
    statusPurpose: 'revocation';
    encodedList: string;
  };
}

export interface StatusListEntry {
  id: string;
  type: 'BitstringStatusListEntry';
  statusPurpose: 'revocation';
  statusListIndex: string;
  statusListCredential: string;
}

@Injectable()
export class StatusListService {
  private readonly baseUrl: string;
  private readonly issuerDid: string;

  // Maximum entries per status list (131,072 = 16KB bitstring)
  // W3C spec recommends at least 16KB for privacy
  static readonly MAX_ENTRIES = 131072;

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
    private readonly configService: ConfigService<AppConfig>,
  ) {
    this.baseUrl =
      this.configService.get('app.baseUrl', { infer: true }) ??
      'http://localhost:3001';
    this.issuerDid =
      this.configService.get('app.issuerDid', { infer: true }) ??
      'did:web:localhost';
  }

  async generateStatusList(
    year: number,
  ): Promise<BitstringStatusListCredential> {
    const revokedIndices = await this.getRevokedIndicesForYear(year);
    const encodedList = await this.createEncodedBitstring(revokedIndices);

    const statusListId = `${this.baseUrl}/status-list/${String(year)}`;

    return {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      id: statusListId,
      type: ['VerifiableCredential', 'BitstringStatusListCredential'],
      issuer: this.issuerDid,
      validFrom: `${String(year)}-01-01T00:00:00Z`,
      credentialSubject: {
        id: `${statusListId}#list`,
        type: 'BitstringStatusList',
        statusPurpose: 'revocation',
        encodedList,
      },
    };
  }

  private async getRevokedIndicesForYear(year: number): Promise<number[]> {
    const startDate = new Date(`${String(year)}-01-01T00:00:00Z`);
    const endDate = new Date(`${String(year + 1)}-01-01T00:00:00Z`);

    const revokedCertificates = await this.certificateRepo.find({
      where: {
        isRevoked: true,
        issuedAt: Between(startDate, endDate),
      },
      select: ['statusListIndex'],
    });

    return revokedCertificates
      .map((c) => c.statusListIndex)
      .filter((index): index is number => index != null);
  }

  async createEncodedBitstring(revokedIndices: number[]): Promise<string> {
    const bitstringLength = Math.ceil(StatusListService.MAX_ENTRIES / 8);
    const bitstring = Buffer.alloc(bitstringLength, 0);

    for (const index of revokedIndices) {
      if (index >= 0 && index < StatusListService.MAX_ENTRIES) {
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        // Set the bit (big-endian: MSB first within each byte)
        bitstring[byteIndex] = bitstring[byteIndex] | (1 << (7 - bitIndex));
      }
    }

    const compressed = await gzip(bitstring);

    return compressed.toString('base64');
  }

  async isIndexRevoked(_year: number, index: number): Promise<boolean> {
    const certificate = await this.certificateRepo.findOne({
      where: {
        statusListIndex: index,
        isRevoked: true,
      },
    });

    return certificate !== null;
  }

  createStatusListEntry(
    statusListIndex: number,
    year: number,
  ): StatusListEntry {
    const statusListUrl = `${this.baseUrl}/status-list/${String(year)}`;

    return {
      id: `${statusListUrl}#${String(statusListIndex)}`,
      type: 'BitstringStatusListEntry',
      statusPurpose: 'revocation',
      statusListIndex: statusListIndex.toString(),
      statusListCredential: statusListUrl,
    };
  }

  async getNextStatusListIndex(): Promise<number> {
    const result = await this.certificateRepo
      .createQueryBuilder('c')
      .select('MAX(c.statusListIndex)', 'max')
      .getRawOne<{ max: number | null }>();

    return (result?.max ?? 0) + 1;
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }
}
