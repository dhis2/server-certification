import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Certificate } from './entities/certificate.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { SubmissionResponse } from '../submissions/entities/submission-response.entity';
import { AssessmentCategory } from '../templates/entities/assessment-category.entity';
import { Criterion } from '../templates/entities/criterion.entity';
import { Implementation } from '../implementations/entities/implementation.entity';
import {
  CertificatesService,
  CredentialIssuanceService,
  StatusListService,
  StatusListCacheService,
} from './services';
import {
  CertificatesController,
  VerificationController,
} from './certificates.controller';
import { StatusListController } from './status-list.controller';
import { SigningModule } from '../signing/signing.module';
import { RedisModule } from '../../shared/redis';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certificate,
      Submission,
      SubmissionResponse,
      AssessmentCategory,
      Criterion,
      Implementation,
    ]),
    ConfigModule,
    SigningModule,
    RedisModule,
  ],
  controllers: [
    CertificatesController,
    VerificationController,
    StatusListController,
  ],
  providers: [
    CertificatesService,
    CredentialIssuanceService,
    StatusListService,
    StatusListCacheService,
  ],
  exports: [
    CertificatesService,
    CredentialIssuanceService,
    StatusListService,
    StatusListCacheService,
  ],
})
export class CertificatesModule {}
