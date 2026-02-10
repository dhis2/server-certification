import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IssueCertificateDto {
  @ApiProperty({
    description: 'ID of the approved submission to issue certificate for',
  })
  @IsUUID()
  submissionId!: string;
}
