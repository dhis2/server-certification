import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CanonicalizationService,
  KeyManagementService,
  KeyRotationService,
  SoftwareSigningService,
} from './services';
import { SigningController } from './signing.controller';
import { KeyAdminController } from './key-admin.controller';
import { SIGNING_SERVICE } from './interfaces';

@Module({
  imports: [ConfigModule],
  controllers: [SigningController, KeyAdminController],
  providers: [
    CanonicalizationService,
    KeyManagementService,
    KeyRotationService,
    SoftwareSigningService,
    {
      provide: SIGNING_SERVICE,
      useExisting: SoftwareSigningService,
    },
  ],
  exports: [
    CanonicalizationService,
    KeyManagementService,
    KeyRotationService,
    SoftwareSigningService,
    SIGNING_SERVICE,
  ],
})
export class SigningModule {}
