import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Implementation } from '../entities/implementation.entity';
import { CreateImplementationDto } from '../dto/create-implementation.dto';
import { UpdateImplementationDto } from '../dto/update-implementation.dto';
import { AuditService, AuditEventType, AuditAction } from '../../audit';
import {
  Connection,
  PaginatedSearchOptions,
  createLikePattern,
  isEmptySearch,
  paginate,
} from 'src/shared/pagination';

export interface FindAllOptions extends PaginatedSearchOptions {
  isActive?: boolean;
}

export type ImplementationsConnection = Connection<Implementation>;

@Injectable()
export class ImplementationsService {
  private readonly logger = new Logger(ImplementationsService.name);

  constructor(
    @InjectRepository(Implementation)
    private readonly implementationRepository: Repository<Implementation>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateImplementationDto,
    userId: string,
  ): Promise<Implementation> {
    const existing = await this.implementationRepository.findOne({
      where: { name: dto.name, isActive: true },
    });
    if (existing) {
      throw new ConflictException(
        'Implementation with this name already exists',
      );
    }

    try {
      const implementation = this.implementationRepository.create({
        ...dto,
        createdById: userId,
      });
      const saved = await this.implementationRepository.save(implementation);

      // Audit logging - don't let audit failures break the main operation
      try {
        await this.auditService.log(
          {
            eventType: AuditEventType.IMPLEMENTATION_CREATED,
            entityType: 'Implementation',
            entityId: saved.id,
            action: AuditAction.CREATE,
            newValues: {
              name: dto.name,
              dhis2InstanceUrl: dto.dhis2InstanceUrl,
            },
          },
          { actorId: userId },
        );
      } catch (auditError) {
        this.logger.error(
          `Failed to log audit event for implementation creation: ${auditError}`,
        );
      }

      return saved;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const message = (error as QueryFailedError).message || '';
        if (
          message.includes('duplicate') ||
          message.includes('unique') ||
          message.includes('UNIQUE')
        ) {
          throw new ConflictException(
            'Implementation with this name already exists',
          );
        }
        this.logger.error(`Database error creating implementation: ${message}`);
        throw new InternalServerErrorException(
          'Failed to create implementation due to a database error',
        );
      }
      throw error;
    }
  }

  async findAll(
    options: FindAllOptions = {},
  ): Promise<ImplementationsConnection> {
    const qb = this.implementationRepository.createQueryBuilder('impl');

    if (options.isActive !== undefined) {
      qb.where('impl.isActive = :isActive', { isActive: options.isActive });
    }

    if (!isEmptySearch(options.search)) {
      const pattern = createLikePattern(options.search!);
      const searchCondition =
        options.isActive !== undefined ? 'andWhere' : 'where';
      qb[searchCondition](
        '(impl.name ILIKE :search OR impl.country ILIKE :search)',
        { search: pattern },
      );
    }

    return paginate(qb, 'impl', {
      first: options.first,
      after: options.after,
      sortDirection: 'DESC',
    });
  }

  async findOne(id: string): Promise<Implementation> {
    const implementation = await this.implementationRepository.findOne({
      where: { id },
    });
    if (!implementation) {
      throw new NotFoundException(`Implementation with ID ${id} not found`);
    }
    return implementation;
  }

  async update(
    id: string,
    dto: UpdateImplementationDto,
    userId: string,
  ): Promise<Implementation> {
    const implementation = await this.findOne(id);
    const oldValues = { name: implementation.name };

    Object.assign(implementation, dto);
    const saved = await this.implementationRepository.save(implementation);

    await this.auditService.log(
      {
        eventType: AuditEventType.IMPLEMENTATION_UPDATED,
        entityType: 'Implementation',
        entityId: saved.id,
        action: AuditAction.UPDATE,
        oldValues,
        newValues: { name: implementation.name },
      },
      { actorId: userId },
    );

    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const implementation = await this.findOne(id);
    implementation.isActive = false;
    await this.implementationRepository.save(implementation);

    await this.auditService.log(
      {
        eventType: AuditEventType.IMPLEMENTATION_DELETED,
        entityType: 'Implementation',
        entityId: id,
        action: AuditAction.DELETE,
      },
      { actorId: userId },
    );
  }
}
