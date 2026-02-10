import { PartialType } from '@nestjs/mapped-types';
import { CreateImplementationDto } from './create-implementation.dto';

export class UpdateImplementationDto extends PartialType(
  CreateImplementationDto,
) {}
