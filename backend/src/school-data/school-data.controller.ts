import { Body, Controller, Get, Put } from '@nestjs/common';
import { SchoolDataService } from './school-data.service';

@Controller('data')
export class SchoolDataController {
  constructor(private readonly schoolData: SchoolDataService) {}

  // GET /api/data
  @Get()
  async get() {
    return { data: await this.schoolData.load() };
  }

  // PUT /api/data
  @Put()
  async put(@Body() body: Record<string, unknown>) {
    await this.schoolData.save(body);
    return { ok: true };
  }
}
