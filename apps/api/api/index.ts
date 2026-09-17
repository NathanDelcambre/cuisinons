import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from '../src/app.module.js';
import { loadEnvFiles } from '../src/config/load-env.js';

loadEnvFiles();

let cached: express.Express | null = null;

async function getServer(): Promise<express.Express> {
  if (cached) return cached;
  const server = express();
  server.use(express.json({ limit: '1mb' }));
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
    bodyParser: false,
  });
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    }),
  );
  app.enableCors({ origin: false });
  await app.init();
  cached = server;
  return server;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const server = await getServer();
  server(req, res);
}
