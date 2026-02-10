import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSubmissionDto } from './create-submission.dto';

export class UpdateSubmissionDto extends PartialType(
  OmitType(CreateSubmissionDto, ['implementationId', 'templateId'] as const),
) {}
