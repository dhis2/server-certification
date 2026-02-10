import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../iam/authentication/decorators/public.decorator';
import { SoftwareSigningService } from './services';

interface VerificationMethodEntry {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
}

interface DidDocument {
  '@context': string[];
  id: string;
  verificationMethod: VerificationMethodEntry[];
  assertionMethod: string[];
  authentication: string[];
}

@Controller('.well-known')
@ApiTags('DID')
export class SigningController {
  private readonly issuerDid: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly signingService: SoftwareSigningService,
  ) {
    this.issuerDid =
      this.configService.get<string>('ISSUER_DID') ??
      'did:web:certification.dhis2.org';
  }

  @Get('did.json')
  @Public()
  @Header('Content-Type', 'application/did+json')
  @ApiOperation({
    summary: 'Get DID Document',
    description:
      'Returns the DID document for the certification authority (did:web)',
  })
  @ApiOkResponse({
    description: 'DID document in JSON format',
    schema: {
      type: 'object',
      properties: {
        '@context': { type: 'array', items: { type: 'string' } },
        id: { type: 'string' },
        verificationMethod: { type: 'array' },
        assertionMethod: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getDidDocument(): Promise<DidDocument> {
    const verificationMethod =
      await this.signingService.getVerificationMethod();

    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id: this.issuerDid,
      verificationMethod: [verificationMethod],
      assertionMethod: [verificationMethod.id],
      authentication: [verificationMethod.id],
    };
  }

  @Get('did-configuration.json')
  @Public()
  @Header('Content-Type', 'application/json')
  @ApiOperation({
    summary: 'Get DID Configuration',
    description:
      'Returns the DID Configuration for domain linkage verification',
  })
  getDidConfiguration(): {
    '@context': string;
    linked_dids: string[];
  } {
    return {
      '@context':
        'https://identity.foundation/.well-known/did-configuration/v1',
      linked_dids: [this.issuerDid],
    };
  }
}
