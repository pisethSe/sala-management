import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  // GET /api/students: every student
  @Get()
  async list() {
    return { students: await this.students.listStudents() };
  }

  // POST /api/students: enrol one student. The server assigns id and code.
  @Post()
  @HttpCode(201)
  async create(@Body() body: Record<string, unknown>) {
    return { student: await this.students.createStudent(body) };
  }

  // DELETE /api/students: remove every student (Settings -> Clear all data)
  @Delete()
  async removeAll() {
    await this.students.deleteAllStudents();
    return { ok: true };
  }

  // GET /api/students/:id
  @Get(':id')
  async get(@Param('id') id: string) {
    const s = await this.students.getStudent(id);
    if (!s) throw new NotFoundException('Student not found');
    return { student: s };
  }

  // PUT /api/students/:id: update every editable field
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const s = await this.students.updateStudent(id, body);
    if (!s) throw new NotFoundException('Student not found');
    return { student: s };
  }

  // DELETE /api/students/:id
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const ok = await this.students.deleteStudent(id);
    if (!ok) throw new NotFoundException('Student not found');
    return { ok: true };
  }
}
