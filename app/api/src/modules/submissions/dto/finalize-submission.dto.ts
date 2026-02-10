import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FinalizeSubmissionDto {
  @ApiPropertyOptional({
    example:
      'Assessment completed successfully. All technical controls for DSCP1 are compliant.',
    description: 'Final notes from the assessor',
  })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  assessorNotes?: string;
}
