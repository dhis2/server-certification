import type { DataIntegrityProof } from '../../signing/interfaces';

export interface CredentialSubjectResult {
  type: 'Result';
  resultDescription: string;
  value: string;
}

export interface CredentialSubjectAchievement {
  id: string;
  type: 'Achievement';
  name: string;
  description: string;
  achievementType: 'Certificate';
  criteria: {
    narrative: string;
  };
}

export interface CredentialSubject {
  type: 'AchievementSubject';
  id: string;
  achievement: CredentialSubjectAchievement;
  result: CredentialSubjectResult[];
}

export interface CredentialIssuer {
  id: string;
  type: 'Profile';
  name: string;
}

export interface CredentialStatus {
  id: string;
  type: 'BitstringStatusListEntry';
  statusPurpose: 'revocation';
  statusListIndex: string;
  statusListCredential: string;
}

export interface DHIS2ServerCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: CredentialIssuer;
  validFrom: string;
  validUntil: string;
  credentialSubject: CredentialSubject;
  credentialStatus: CredentialStatus;
  proof?: DataIntegrityProof;
}

export interface IssuanceInput {
  submissionId: string;
  implementationId: string;
  implementationName: string;
  certificationResult: 'pass' | 'fail';
  controlGroup: 'DSCP1';
  finalScore: number;
  categoryScores: { name: string; score: number }[];
  validFrom: Date;
  validUntil: Date;
}
