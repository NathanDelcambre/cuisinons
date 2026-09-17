import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { loadApiEnv } from './config/env.js';
import { loadEnvFiles } from './config/load-env.js';

async function bootstrap() {
  loadEnvFiles();
  const env = loadApiEnv();
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
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
