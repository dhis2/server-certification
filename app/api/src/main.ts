import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filter/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.set('trust proxy', 1); // Trust reverse proxy
  }

  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: isProduction,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: isProduction
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['health'] });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction,
    }),
  );

  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) =>
    o.trim(),
  ) ?? ['http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else if (isProduction) {
        callback(new Error('Not allowed by CORS'));
      } else {
        logger.warn(
          `CORS: Allowing non-whitelisted origin in development: ${origin}`,
        );
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours - reduce preflight requests
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  logger.log(
    `Environment: ${process.env.NODE_ENV}, isProduction: ${isProduction}`,
  );

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('DHIS2 Server Certification API')
      .setDescription(
        'API for DHIS2 server certification Program (with W3C Verifiable Credentials)',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT access token',
          in: 'header',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log('Swagger documentation available at /api/docs');
  }

  const port = process.env.PORT ?? '3001';
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});
