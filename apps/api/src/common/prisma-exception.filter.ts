import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

/**
 * Maps database errors that callers can act on to HTTP responses, so services
 * can rely on constraints instead of racing "check then write" queries.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.map(error);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Unhandled Prisma error ${error.code}`, error.stack);
    }

    response.status(status).json({ statusCode: status, message });
  }

  private map(error: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
    switch (error.code) {
      case 'P2002': {
        const fields = uniqueFields(error);
        return {
          status: HttpStatus.CONFLICT,
          message: fields ? `${fields} is already in use` : 'This record already exists',
        };
      }
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'This record is in use or refers to something that does not exist',
        };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Not found' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }
  }
}

function uniqueFields(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const meta = error.meta as
    | {
        target?: string[] | string;
        driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
      }
    | undefined;
  const fields = meta?.driverAdapterError?.cause?.constraint?.fields ?? meta?.target;
  if (!fields) return undefined;
  const list = (Array.isArray(fields) ? fields : [fields]).map((field) =>
    field.replaceAll('"', ''),
  );
  return list.length ? list.join(', ').replace(/^./, (c) => c.toUpperCase()) : undefined;
}
