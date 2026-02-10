export interface CertificateAuditEvent {
  eventType:
    | 'CERTIFICATE_ISSUED'
    | 'CERTIFICATE_REVOKED'
    | 'CERTIFICATE_VERIFIED';
  entityType: 'Certificate';
  entityId: string;
  actorId: string | null;
  actorIp?: string;
  timestamp: Date;
  details: {
    certificateNumber?: string;
    implementationId?: string;
    revocationReason?: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
  };
}
