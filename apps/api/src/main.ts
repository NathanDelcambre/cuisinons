import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module.js';
import { loadApiEnv } from './config/env.js';
import { loadEnvFiles } from './config/load-env.js';

async function bootstrap() {
  loadEnvFiles();
  const env = loadApiEnv();
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'], bodyParser: false });
  // Photo de recette en JSON base64 : le plafond Express par defaut (100 Ko) est trop bas.
  app.use(json({ limit: '1mb' }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.enableCors({ origin: false });
  if (env.APP_ENV !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('Cuisinons API')
      .setDescription('API interne — ne pas exposer au navigateur')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  }
  await app.listen(env.PORT, '127.0.0.1');
}

void bootstrap();
