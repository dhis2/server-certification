import { SetMetadata } from '@nestjs/common';
import {
  RESOURCE_OWNER_KEY,
  ResourceOwnerOptions,
} from '../guards/resource-owner.guard';

export const ResourceOwner = (options: ResourceOwnerOptions = {}) =>
  SetMetadata(RESOURCE_OWNER_KEY, options);
