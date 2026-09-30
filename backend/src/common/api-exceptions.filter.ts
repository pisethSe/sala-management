import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

// Raised by the services when a payload fails validation. Mapped to 400.
export class ValidationException extends Error {}

// Every error returns { error: message } so the frontend's fetch helper can
// show the server's message directly, matching the original API's contract.
@Catch()
export class ApiExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof ValidationException) {
      res.status(400).json({ error: exception.message });
      return;
    }
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json({ error: exception.message });
      return;
    }
    const message = exception instanceof Error ? exception.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
