import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StudentsModule } from './students/students.module';
import { SchoolDataModule } from './school-data/school-data.module';
import { HealthModule } from './health/health.module';
import { APP_FILTER } from '@nestjs/core';
import { ApiExceptionsFilter } from './common/api-exceptions.filter';

@Module({
  imports: [DatabaseModule, RedisModule, StudentsModule, SchoolDataModule, HealthModule],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionsFilter }],
})
export class AppModule {}
