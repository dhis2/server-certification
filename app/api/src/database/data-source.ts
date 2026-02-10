import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const isProduction = process.env.NODE_ENV === 'production';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5433', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: isProduction }
      : false,
  entities: isProduction ? ['dist/**/*.entity.js'] : ['src/**/*.entity.ts'],
  migrations: isProduction
    ? ['dist/database/migrations/*.js']
    : ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: !isProduction,
  logging: !isProduction,
});

export default dataSource;
