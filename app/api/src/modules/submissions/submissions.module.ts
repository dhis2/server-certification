import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService, ScoringService } from './services';
import { Submission } from './entities/submission.entity';
import { SubmissionResponse } from './entities/submission-response.entity';
import { Implementation } from '../implementations/entities/implementation.entity';
import { AssessmentTemplate } from '../templates/entities/assessment-template.entity';
import { Criterion } from '../templates/entities/criterion.entity';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Submission,
      SubmissionResponse,
      Implementation,
      AssessmentTemplate,
      Criterion,
    ]),
    CertificatesModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, ScoringService],
  exports: [SubmissionsService, ScoringService],
})
export class SubmissionsModule {}
