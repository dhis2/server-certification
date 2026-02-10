import { Logger } from '@nestjs/common';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { hash, genSalt } from 'bcrypt';
import { Role } from 'src/modules/iam/authorization/entities/role.entity';
import { User } from 'src/modules/users/entities/user.entity';

config({ path: '.env.local' });
config({ path: '.env' });

const logger = new Logger('Seed');

const isProduction = process.env.NODE_ENV === 'production';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Role, User],
  logging: !isProduction,
});

interface SeedRole {
  name: string;
  description: string;
  isDefault?: boolean;
}

interface SeedUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleName: string;
}

const ROLES: SeedRole[] = [
  { name: 'admin', description: 'Administrator with full access' },
  { name: 'user', description: 'Standard user role', isDefault: true },
];

function getDevUsers(): SeedUser[] {
  return [
    {
      firstName: 'Admin',
      lastName: 'User',
      email: process.env.SEED_DEV_ADMIN_EMAIL ?? 'admin@localhost.dev',
      password: process.env.SEED_DEV_ADMIN_PASSWORD ?? 'DevAdmin#2024!',
      roleName: 'admin',
    },
    {
      firstName: 'User',
      lastName: 'User',
      email: process.env.SEED_DEV_USER_EMAIL ?? 'user@localhost.dev',
      password: process.env.SEED_DEV_USER_PASSWORD ?? 'DevUser#2024!',
      roleName: 'user',
    },
  ];
}

function getProdUsers(): SeedUser[] {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.log(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD not set, skipping admin user seed',
    );
    return [];
  }

  return [
    {
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: adminPassword,
      roleName: 'admin',
    },
  ];
}

async function hashPassword(password: string): Promise<string> {
  const salt = await genSalt(12);
  return hash(password, salt);
}

async function seedRoles(ds: DataSource): Promise<Map<string, Role>> {
  const roleRepo = ds.getRepository(Role);
  const roleMap = new Map<string, Role>();

  for (const roleData of ROLES) {
    let role = await roleRepo.findOne({ where: { name: roleData.name } });

    if (!role) {
      role = roleRepo.create(roleData);
      await roleRepo.save(role);
      logger.log(`Created role: ${role.name}`);
    } else {
      logger.log(`Role exists: ${role.name}`);
    }

    roleMap.set(role.name, role);
  }

  return roleMap;
}

async function seedUsers(
  ds: DataSource,
  roleMap: Map<string, Role>,
): Promise<void> {
  const userRepo = ds.getRepository(User);
  const users = isProduction ? getProdUsers() : getDevUsers();

  for (const userData of users) {
    const existing = await userRepo.findOne({
      where: { email: userData.email },
    });

    if (!existing) {
      const role = roleMap.get(userData.roleName);
      if (!role) {
        logger.error(`Role not found: ${userData.roleName}`);
        continue;
      }

      const user = userRepo.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: await hashPassword(userData.password),
        role,
      });

      await userRepo.save(user);
      logger.log(`Created user: ${user.email}`);
    } else {
      logger.log(`User exists: ${existing.email}`);
    }
  }
}

async function seed(): Promise<void> {
  logger.log(
    `Running seeds (${isProduction ? 'production' : 'development'} mode)...`,
  );

  await dataSource.initialize();

  try {
    const roleMap = await seedRoles(dataSource);
    await seedUsers(dataSource, roleMap);
    logger.log('Seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();
