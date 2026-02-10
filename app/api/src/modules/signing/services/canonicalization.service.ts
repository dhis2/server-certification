import { Injectable, Logger } from '@nestjs/common';
import * as jsonld from 'jsonld';

/**
 * W3C Data Integrity compliant canonicalization service.
 *
 * Implements:
 * - RDFC-1.0 (RDF Dataset Canonicalization) for JSON-LD documents
 * - JCS (JSON Canonicalization Scheme - RFC 8785) for proof options
 *
 * @see https://www.w3.org/TR/rdf-canon/
 * @see https://www.w3.org/TR/vc-di-eddsa/#hashing-eddsa-rdfc-2022
 * @see https://www.rfc-editor.org/rfc/rfc8785
 */
@Injectable()
export class CanonicalizationService {
  private readonly logger = new Logger(CanonicalizationService.name);

  private readonly documentLoader: jsonld.Options['documentLoader'];

  constructor() {
    this.documentLoader = this.createDocumentLoader();
  }

  async canonicalizeDocument(document: object): Promise<Uint8Array> {
    try {
      const canonicalized = await jsonld.canonize(document, {
        algorithm: 'RDFC-1.0',
        format: 'application/n-quads',
        documentLoader: this.documentLoader,
        // Disable safe mode to allow custom vocabulary extensions
        // (e.g., DHIS2ServerCertification) not defined in standard contexts
        safe: false,
      });

      return new TextEncoder().encode(canonicalized as string);
    } catch (error) {
      this.logger.error('RDFC-1.0 canonicalization failed', error);
      throw new Error(
        `Canonicalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  canonicalizeProofOptions(proofOptions: object): Uint8Array {
    const canonical = this.jcsSerialize(proofOptions);
    return new TextEncoder().encode(canonical);
  }

  // RFC 8785 JSON Canonicalization Scheme
  private jcsSerialize(value: unknown): string {
    if (value === null) {
      return 'null';
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error('JCS does not support Infinity or NaN');
      }
      return JSON.stringify(value);
    }

    if (typeof value === 'string') {
      return this.jcsSerializeString(value);
    }

    if (Array.isArray(value)) {
      const elements = value.map((v) => this.jcsSerialize(v));
      return '[' + elements.join(',') + ']';
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      const pairs = keys.map(
        (key) =>
          this.jcsSerializeString(key) + ':' + this.jcsSerialize(obj[key]),
      );
      return '{' + pairs.join(',') + '}';
    }

    throw new Error(`Unsupported type in JCS serialization: ${typeof value}`);
  }

  private jcsSerializeString(str: string): string {
    let result = '"';
    for (const char of str) {
      const code = char.charCodeAt(0);
      if (code === 0x08) {
        result += '\\b';
      } else if (code === 0x09) {
        result += '\\t';
      } else if (code === 0x0a) {
        result += '\\n';
      } else if (code === 0x0c) {
        result += '\\f';
      } else if (code === 0x0d) {
        result += '\\r';
      } else if (code === 0x22) {
        result += '\\"';
      } else if (code === 0x5c) {
        result += '\\\\';
      } else if (code < 0x20) {
        result += '\\u' + code.toString(16).padStart(4, '0');
      } else {
        result += char;
      }
    }
    result += '"';
    return result;
  }

  private createDocumentLoader(): jsonld.Options['documentLoader'] {
    const contexts: Record<string, object> = {
      'https://www.w3.org/ns/credentials/v2': this.getCredentialsV2Context(),
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json':
        this.getOpenBadgesContext(),
      'https://www.w3.org/ns/did/v1': this.getDidContext(),
      'https://w3id.org/security/suites/ed25519-2020/v1':
        this.getEd25519Context(),
      'https://w3id.org/security/data-integrity/v2':
        this.getDataIntegrityContext(),
    };

    return async (url: string) => {
      if (contexts[url]) {
        return {
          contextUrl: undefined,
          document: contexts[url],
          documentUrl: url,
        };
      }

      this.logger.warn(`Unknown context requested: ${url}, attempting fetch`);
      const nodeDocumentLoader = jsonld.documentLoaders.node();
      return nodeDocumentLoader(url);
    };
  }

  private getCredentialsV2Context(): object {
    return {
      '@context': {
        '@protected': true,
        id: '@id',
        type: '@type',
        VerifiableCredential: {
          '@id': 'https://www.w3.org/2018/credentials#VerifiableCredential',
          '@context': {
            '@protected': true,
            id: '@id',
            type: '@type',
            credentialSubject: {
              '@id': 'https://www.w3.org/2018/credentials#credentialSubject',
              '@type': '@id',
            },
            issuer: {
              '@id': 'https://www.w3.org/2018/credentials#issuer',
              '@type': '@id',
            },
            validFrom: {
              '@id': 'https://www.w3.org/2018/credentials#validFrom',
              '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
            },
            validUntil: {
              '@id': 'https://www.w3.org/2018/credentials#validUntil',
              '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
            },
            credentialStatus: {
              '@id': 'https://www.w3.org/2018/credentials#credentialStatus',
              '@type': '@id',
            },
            proof: {
              '@id': 'https://w3id.org/security#proof',
              '@type': '@id',
              '@container': '@graph',
            },
          },
        },
        BitstringStatusListCredential: {
          '@id':
            'https://www.w3.org/ns/credentials/status#BitstringStatusListCredential',
        },
        BitstringStatusListEntry: {
          '@id':
            'https://www.w3.org/ns/credentials/status#BitstringStatusListEntry',
          '@context': {
            '@protected': true,
            id: '@id',
            type: '@type',
            statusPurpose:
              'https://www.w3.org/ns/credentials/status#statusPurpose',
            statusListIndex:
              'https://www.w3.org/ns/credentials/status#statusListIndex',
            statusListCredential: {
              '@id':
                'https://www.w3.org/ns/credentials/status#statusListCredential',
              '@type': '@id',
            },
          },
        },
        name: 'https://schema.org/name',
        description: 'https://schema.org/description',
      },
    };
  }

  private getOpenBadgesContext(): object {
    return {
      '@context': {
        '@protected': true,
        id: '@id',
        type: '@type',
        OpenBadgeCredential: {
          '@id':
            'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#OpenBadgeCredential',
        },
        AchievementSubject: {
          '@id':
            'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#AchievementSubject',
        },
        Achievement: {
          '@id':
            'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#Achievement',
          '@context': {
            achievementType:
              'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#achievementType',
            criteria: {
              '@id':
                'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#criteria',
              '@type': '@id',
            },
          },
        },
        Profile: {
          '@id': 'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#Profile',
        },
        Result: {
          '@id': 'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#Result',
        },
        achievement: {
          '@id':
            'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#achievement',
        },
        result: {
          '@id': 'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#result',
        },
        resultDescription:
          'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#resultDescription',
        value: 'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#value',
        narrative:
          'https://purl.imsglobal.org/spec/ob/v3p0/vocab.html#narrative',
        name: 'https://schema.org/name',
        description: 'https://schema.org/description',
      },
    };
  }

  private getDidContext(): object {
    return {
      '@context': {
        '@protected': true,
        id: '@id',
        type: '@type',
        controller: {
          '@id': 'https://w3id.org/security#controller',
          '@type': '@id',
        },
        verificationMethod: {
          '@id': 'https://w3id.org/security#verificationMethod',
          '@type': '@id',
        },
        publicKeyMultibase: {
          '@id': 'https://w3id.org/security#publicKeyMultibase',
        },
      },
    };
  }

  private getEd25519Context(): object {
    return {
      '@context': {
        '@protected': true,
        id: '@id',
        type: '@type',
        Ed25519VerificationKey2020: {
          '@id': 'https://w3id.org/security#Ed25519VerificationKey2020',
        },
        publicKeyMultibase: 'https://w3id.org/security#publicKeyMultibase',
      },
    };
  }

  private getDataIntegrityContext(): object {
    return {
      '@context': {
        '@protected': true,
        id: '@id',
        type: '@type',
        DataIntegrityProof: {
          '@id': 'https://w3id.org/security#DataIntegrityProof',
          '@context': {
            '@protected': true,
            cryptosuite: 'https://w3id.org/security#cryptosuite',
            proofPurpose: {
              '@id': 'https://w3id.org/security#proofPurpose',
              '@type': '@vocab',
            },
            proofValue: 'https://w3id.org/security#proofValue',
            verificationMethod: {
              '@id': 'https://w3id.org/security#verificationMethod',
              '@type': '@id',
            },
            created: {
              '@id': 'http://purl.org/dc/terms/created',
              '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
            },
            assertionMethod: {
              '@id': 'https://w3id.org/security#assertionMethod',
              '@type': '@id',
            },
          },
        },
      },
    };
  }
}
