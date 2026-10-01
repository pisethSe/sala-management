import 'reflect-metadata';
import { readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Loads .env.local when the process wasn't started with --env-file, so both
// `npm start` and `npm run start:dev` pick up DATABASE_URL and REDIS_URL.
// Skipped silently when the file doesn't exist (e.g. in Docker, where the
// environment comes from docker compose).
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = (m[2] ?? '').replace(/^["']|["']$/g, '');
  }
} catch {}

// The API serves the Next.js frontend under a single "api" prefix:
// /api/data, /api/students, /api/students/:id and /api/health.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Lock CORS to the frontend origins in production (CORS_ORIGIN, comma-separated).
  // Unset (or "true") reflects the request origin, as in local development.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors(corsOrigin && corsOrigin !== 'true' ? { origin: corsOrigin.split(',') } : undefined);
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`Sala API listening on http://localhost:${port}/api`);
}
void bootstrap();
