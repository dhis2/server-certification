import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v7 as uuidv7 } from 'uuid';
import type { Request as ExpressRequest } from 'express';

import { ImplementationsController } from '../../src/modules/implementations/implementations.controller';
import { ImplementationsService } from '../../src/modules/implementations/services/implementations.service';
import { Implementation } from '../../src/modules/implementations/entities/implementation.entity';
import { AuditService } from '../../src/modules/audit/services/audit.service';
import { AuthenticationGuard } from '../../src/modules/iam/authentication/guards/authentication/authentication.guard';
import { RolesGuard } from '../../src/modules/iam/authorization/guards/roles.guard';
import { ActiveUserData } from '../../src/modules/iam/interfaces/active-user-data.interface';

interface ImplementationResponse {
  id: string;
  name: string;
  country: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  dhis2InstanceUrl: string;
  dhis2Version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  message: string | string[];
  statusCode: number;
}

describe('Implementations (e2e)', () => {
  let app: INestApplication;
  let mockRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };

  // In-memory storage for implementations
  const implementations: Map<string, Implementation> = new Map();

  const mockAdminUser: ActiveUserData = {
    jti: uuidv7(),
    refreshTokenId: uuidv7(),
    sub: uuidv7(),
    email: 'admin@test.com',
    roleId: 1,
    roleName: 'admin',
  };

  const mockAssessorUser: ActiveUserData = {
    jti: uuidv7(),
    refreshTokenId: uuidv7(),
    sub: uuidv7(),
    email: 'assessor@test.com',
    roleId: 2,
    roleName: 'assessor',
  };

  let currentUser: ActiveUserData = mockAdminUser;

  // Mock guards that inject user data
  const mockAuthenticationGuard = {
    canActivate: (context: ExecutionContext): boolean => {
      const req = context
        .switchToHttp()
        .getRequest<ExpressRequest & { user?: ActiveUserData }>();
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
      }
      // Inject user based on token content
      req.user = currentUser;
      return true;
    },
  };

  const mockRolesGuard = {
    canActivate: (context: ExecutionContext): boolean => {
      const req = context
        .switchToHttp()
        .getRequest<ExpressRequest & { user?: ActiveUserData }>();
      const user = req.user;
      if (!user) return false;

      const handler = context.getHandler();

      // Get required roles from metadata
      const requiredRoles = Reflect.getMetadata('roles', handler) as
        | string[]
        | undefined;

      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      return requiredRoles.includes(user.roleName ?? '');
    },
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    // Create mock repository with in-memory storage
    mockRepository = {
      create: jest.fn().mockImplementation(
        (data: Partial<Implementation>): Partial<Implementation> => ({
          id: uuidv7(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        }),
      ),
      save: jest
        .fn()
        .mockImplementation(
          (entity: Partial<Implementation>): Promise<Implementation> => {
            const saved = {
              ...entity,
              id: entity.id ?? uuidv7(),
              createdAt: entity.createdAt ?? new Date(),
              updatedAt: new Date(),
            } as Implementation;
            implementations.set(saved.id, saved);
            return Promise.resolve(saved);
          },
        ),
      find: jest
        .fn()
        .mockImplementation(
          ({
            where,
            order,
          }: {
            where?: { isActive?: boolean };
            order?: { name?: 'ASC' | 'DESC' };
          }): Promise<Implementation[]> => {
            let result = Array.from(implementations.values());
            if (where && where.isActive !== undefined) {
              result = result.filter(
                (impl) => impl.isActive === where.isActive,
              );
            }
            if (order?.name === 'ASC') {
              result.sort((a, b) => a.name.localeCompare(b.name));
            }
            return Promise.resolve(result);
          },
        ),
      findOne: jest
        .fn()
        .mockImplementation(
          ({
            where,
          }: {
            where: { id?: string; name?: string; isActive?: boolean };
          }): Promise<Implementation | null> => {
            if (where.id) {
              return Promise.resolve(implementations.get(where.id) ?? null);
            }
            if (where.name) {
              const found = Array.from(implementations.values()).find(
                (impl) =>
                  impl.name === where.name &&
                  (where.isActive === undefined ||
                    impl.isActive === where.isActive),
              );
              return Promise.resolve(found ?? null);
            }
            return Promise.resolve(null);
          },
        ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ImplementationsController],
      providers: [
        ImplementationsService,
        {
          provide: getRepositoryToken(Implementation),
          useValue: mockRepository,
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    })
      .overrideGuard(AuthenticationGuard)
      .useValue(mockAuthenticationGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset to admin user
    currentUser = mockAdminUser;
    // Clear audit mock
    mockAuditService.log.mockClear();
    // Clear in-memory storage
    implementations.clear();
  });

  describe('POST /implementations', () => {
    const createImplementationDto = {
      name: 'Ministry of Health Kenya',
      country: 'Kenya',
      contactEmail: 'admin@health.go.ke',
      contactPhone: '+254-20-271-7077',
      description: 'Kenya MOH DHIS2 implementation',
      dhis2InstanceUrl: 'https://dhis2.health.go.ke',
      dhis2Version: '2.40.2',
    };

    it('should create an implementation with valid data (admin)', async () => {
      const response = await request(app.getHttpServer())
        .post('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .send(createImplementationDto)
        .expect(201);

      const body = response.body as ImplementationResponse;
      expect(body).toMatchObject({
        name: createImplementationDto.name,
        country: createImplementationDto.country,
        contactEmail: createImplementationDto.contactEmail,
        dhis2InstanceUrl: createImplementationDto.dhis2InstanceUrl,
        isActive: true,
      });
      expect(body.id).toBeDefined();
      expect(body.createdAt).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/implementations')
        .send(createImplementationDto)
        .expect(403);
    });

    it('should reject assessor role (admin only)', async () => {
      currentUser = mockAssessorUser;

      await request(app.getHttpServer())
        .post('/implementations')
        .set('Authorization', 'Bearer assessor-token')
        .send(createImplementationDto)
        .expect(403);
    });

    it('should reject invalid input - missing required field', async () => {
      const invalidDto = { ...createImplementationDto };
      delete (invalidDto as Record<string, unknown>).name;

      const response = await request(app.getHttpServer())
        .post('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidDto)
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('name')]),
      );
    });

    it('should reject invalid email format', async () => {
      const invalidDto = {
        ...createImplementationDto,
        contactEmail: 'invalid-email',
      };

      const response = await request(app.getHttpServer())
        .post('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidDto)
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('email')]),
      );
    });

    it('should reject invalid URL format', async () => {
      const invalidDto = {
        ...createImplementationDto,
        dhis2InstanceUrl: 'not-a-url',
      };

      const response = await request(app.getHttpServer())
        .post('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidDto)
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('URL')]),
      );
    });

    it('should reject duplicate implementation name', async () => {
      // First create an implementation
      await request(app.getHttpServer())
        .post('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .send(createImplementationDto)
        .expect(201);

      // Try to create another with the same name
      const response = await request(app.getHttpServer())
        .post('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .send(createImplementationDto)
        .expect(409);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('already exists');
    });

    it('should call audit service on creation', async () => {
      await request(app.getHttpServer())
        .post('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .send(createImplementationDto)
        .expect(201);

      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('GET /implementations', () => {
    beforeEach(() => {
      // Create test implementations in memory
      const implementations = [
        {
          id: uuidv7(),
          name: 'Implementation A',
          country: 'Kenya',
          contactEmail: 'a@test.com',
          dhis2InstanceUrl: 'https://dhis2.a.test',
          dhis2Version: '2.40.0',
          isActive: true,
          createdById: mockAdminUser.sub,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv7(),
          name: 'Implementation B',
          country: 'Tanzania',
          contactEmail: 'b@test.com',
          dhis2InstanceUrl: 'https://dhis2.b.test',
          dhis2Version: '2.39.0',
          isActive: true,
          createdById: mockAdminUser.sub,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv7(),
          name: 'Implementation C (Inactive)',
          country: 'Uganda',
          contactEmail: 'c@test.com',
          dhis2InstanceUrl: 'https://dhis2.c.test',
          dhis2Version: '2.38.0',
          isActive: false,
          createdById: mockAdminUser.sub,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      implementations.forEach((implementation) =>
        implementations.set(
          implementation.id,
          implementation as Implementation,
        ),
      );
    });

    it('should list all implementations (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as ImplementationResponse[];
      expect(body).toHaveLength(3);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('name');
    });

    it('should list all implementations (assessor)', async () => {
      currentUser = mockAssessorUser;

      const response = await request(app.getHttpServer())
        .get('/implementations')
        .set('Authorization', 'Bearer assessor-token')
        .expect(200);

      const body = response.body as ImplementationResponse[];
      expect(body).toHaveLength(3);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/implementations').expect(403);
    });

    it('should filter by isActive=true', async () => {
      const response = await request(app.getHttpServer())
        .get('/implementations')
        .query({ isActive: true })
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as ImplementationResponse[];
      expect(body).toHaveLength(2);
      body.forEach((org) => {
        expect(org.isActive).toBe(true);
      });
    });

    it('should filter by isActive=false', async () => {
      const response = await request(app.getHttpServer())
        .get('/implementations')
        .query({ isActive: false })
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as ImplementationResponse[];
      expect(body).toHaveLength(1);
      expect(body[0].isActive).toBe(false);
    });

    it('should return implementations sorted by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/implementations')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as ImplementationResponse[];
      const names = body.map((org) => org.name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('GET /implementations/:id', () => {
    let testImplementation: Implementation;

    beforeEach(() => {
      testImplementation = {
        id: uuidv7(),
        name: 'Test Implementation',
        country: 'Kenya',
        contactEmail: 'test@implementation.com',
        dhis2InstanceUrl: 'https://dhis2.test.org',
        dhis2Version: '2.40.0',
        isActive: true,
        createdById: mockAdminUser.sub,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Implementation;
      implementations.set(testImplementation.id, testImplementation);
    });

    it('should get implementation by ID (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as ImplementationResponse;
      expect(body).toMatchObject({
        id: testImplementation.id,
        name: testImplementation.name,
        country: testImplementation.country,
      });
    });

    it('should get implementation by ID (assessor)', async () => {
      currentUser = mockAssessorUser;

      const response = await request(app.getHttpServer())
        .get(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer assessor-token')
        .expect(200);

      const body = response.body as ImplementationResponse;
      expect(body.id).toBe(testImplementation.id);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/implementations/${testImplementation.id}`)
        .expect(403);
    });

    it('should return 404 for non-existent implementation', async () => {
      const fakeId = uuidv7();
      await request(app.getHttpServer())
        .get(`/implementations/${fakeId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/implementations/invalid-uuid')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });
  });

  describe('PATCH /implementations/:id', () => {
    let testImplementation: Implementation;

    beforeEach(() => {
      testImplementation = {
        id: uuidv7(),
        name: 'Test Implementation',
        country: 'Kenya',
        contactEmail: 'test@org.com',
        dhis2InstanceUrl: 'https://dhis2.test.org',
        dhis2Version: '2.40.0',
        isActive: true,
        createdById: mockAdminUser.sub,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Implementation;
      implementations.set(testImplementation.id, testImplementation);
    });

    it('should update implementation (admin)', async () => {
      const updateDto = {
        name: 'Updated Implementation Name',
        dhis2Version: '2.41.0',
      };

      const response = await request(app.getHttpServer())
        .patch(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer admin-token')
        .send(updateDto)
        .expect(200);

      const body = response.body as ImplementationResponse;
      expect(body.name).toBe(updateDto.name);
      expect(body.dhis2Version).toBe(updateDto.dhis2Version);
      expect(body.country).toBe(testImplementation.country);
    });

    it('should reject assessor role (admin only)', async () => {
      currentUser = mockAssessorUser;

      await request(app.getHttpServer())
        .patch(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer assessor-token')
        .send({ name: 'New Name' })
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch(`/implementations/${testImplementation.id}`)
        .send({ name: 'New Name' })
        .expect(403);
    });

    it('should return 404 for non-existent implementation', async () => {
      const fakeId = uuidv7();
      await request(app.getHttpServer())
        .patch(`/implementations/${fakeId}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should validate update data', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ contactEmail: 'invalid-email' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('email')]),
      );
    });

    it('should handle partial updates', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ country: 'Tanzania' })
        .expect(200);

      const body = response.body as ImplementationResponse;
      expect(body.country).toBe('Tanzania');
      expect(body.name).toBe(testImplementation.name);
    });

    it('should call audit service on update', async () => {
      await request(app.getHttpServer())
        .patch(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('DELETE /implementations/:id', () => {
    let testImplementation: Implementation;

    beforeEach(() => {
      testImplementation = {
        id: uuidv7(),
        name: 'Test Implementation',
        country: 'Kenya',
        contactEmail: 'test@org.com',
        dhis2InstanceUrl: 'https://dhis2.test.org',
        dhis2Version: '2.40.0',
        isActive: true,
        createdById: mockAdminUser.sub,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Implementation;
      implementations.set(testImplementation.id, testImplementation);
    });

    it('should soft delete implementation (admin)', async () => {
      await request(app.getHttpServer())
        .delete(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(204);

      // Verify soft delete
      const deleted = implementations.get(testImplementation.id);
      expect(deleted).toBeDefined();
      expect(deleted?.isActive).toBe(false);
    });

    it('should reject assessor role (admin only)', async () => {
      currentUser = mockAssessorUser;

      await request(app.getHttpServer())
        .delete(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer assessor-token')
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/implementations/${testImplementation.id}`)
        .expect(403);
    });

    it('should return 404 for non-existent implementation', async () => {
      const fakeId = uuidv7();
      await request(app.getHttpServer())
        .delete(`/implementations/${fakeId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .delete('/implementations/invalid-uuid')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });

    it('should call audit service on deletion', async () => {
      await request(app.getHttpServer())
        .delete(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(204);

      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('Response DTO structure', () => {
    let testImplementation: Implementation;

    beforeEach(() => {
      testImplementation = {
        id: uuidv7(),
        name: 'Test Implementation',
        country: 'Kenya',
        contactEmail: 'test@org.com',
        contactPhone: '+254-20-271-7077',
        description: 'Test description',
        dhis2InstanceUrl: 'https://dhis2.test.org',
        dhis2Version: '2.40.0',
        isActive: true,
        createdById: mockAdminUser.sub,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Implementation;
      implementations.set(testImplementation.id, testImplementation);
    });

    it('should return expected fields and exclude internal fields', async () => {
      const response = await request(app.getHttpServer())
        .get(`/implementations/${testImplementation.id}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as Record<string, unknown>;
      // Should include these fields
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('contactEmail');
      expect(body).toHaveProperty('contactPhone');
      expect(body).toHaveProperty('description');
      expect(body).toHaveProperty('dhis2InstanceUrl');
      expect(body).toHaveProperty('dhis2Version');
      expect(body).toHaveProperty('isActive');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');

      // Should NOT include internal fields
      expect(body).not.toHaveProperty('createdById');
      expect(body).not.toHaveProperty('generateId');
    });
  });
});
