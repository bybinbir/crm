import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';
import { seedAdminUser } from './common/utils/seed-admin.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seed admin user on bootstrap
  const prisma = app.get(PrismaService);
  await seedAdminUser(prisma);

  // Cookie parser middleware
  app.use(cookieParser());

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`🚀 API running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
