import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Implementation } from '../entities/implementation.entity';

export class ImplementationResponseDto {
  @ApiProperty({ example: '01912345-6789-7abc-def0-123456789abc' })
  id!: string;

  @ApiProperty({ example: 'Ministry of Health Kenya' })
  name!: string;

  @ApiPropertyOptional({ example: 'Kenya' })
  country!: string | null;

  @ApiPropertyOptional({ example: 'admin@health.go.ke' })
  contactEmail!: string | null;

  @ApiPropertyOptional({ example: '+254-20-271-7077' })
  contactPhone!: string | null;

  @ApiPropertyOptional({ example: 'Kenya MOH DHIS2 implementation' })
  description!: string | null;

  @ApiPropertyOptional({ example: 'https://dhis2.health.go.ke' })
  dhis2InstanceUrl!: string | null;

  @ApiPropertyOptional({ example: '2.40.2' })
  dhis2Version!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt!: Date;

  static fromEntity(entity: Implementation): ImplementationResponseDto {
    const dto = new ImplementationResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.country = entity.country;
    dto.contactEmail = entity.contactEmail;
    dto.contactPhone = entity.contactPhone;
    dto.description = entity.description;
    dto.dhis2InstanceUrl = entity.dhis2InstanceUrl;
    dto.dhis2Version = entity.dhis2Version;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
