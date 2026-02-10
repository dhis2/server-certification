export interface PublicKeyJwk {
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
}

export interface DataIntegrityProof {
  type: 'DataIntegrityProof';
  cryptosuite: 'eddsa-rdfc-2022';
  created: string;
  verificationMethod: string;
  proofPurpose: 'assertionMethod';
  proofValue: string;
}

export interface VerificationMethod {
  id: string;
  type: 'Ed25519VerificationKey2020';
  controller: string;
  publicKeyMultibase: string;
}

export interface SigningService {
  sign(data: Uint8Array): Promise<Uint8Array>;
  getPublicKey(): Promise<Uint8Array>;
  getPublicKeyMultibase(): Promise<string>;
  getKeyVersion(): number;
  getVerificationMethod(): Promise<VerificationMethod>;
}

export const SIGNING_SERVICE = Symbol('SIGNING_SERVICE');
