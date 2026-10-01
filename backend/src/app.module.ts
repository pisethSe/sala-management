import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StudentsModule } from './students/students.module';
import { SchoolDataModule } from './school-data/school-data.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ApiExceptionsFilter } from './common/api-exceptions.filter';
import { JwtAuthGuard } from './auth/jwt.guard';

@Module({
  imports: [DatabaseModule, RedisModule, StudentsModule, SchoolDataModule, HealthModule, AuthModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: ApiExceptionsFilter },
  ],
})
export class AppModule {}
