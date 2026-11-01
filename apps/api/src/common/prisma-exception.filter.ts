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

/**
 * The field a unique violation is about, from the driver's constraint name.
 * Prisma names unique indexes `<table>_<field>_key`; composite uniques set an
 * explicit `map:` in the schema that follows the same pattern for the field
 * users can change (e.g. option_values_slug_key).
 */
function uniqueFields(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const cause = (
    error.meta as
      | { driverAdapterError?: { cause?: { table?: string; constraint?: { index?: string } } } }
      | undefined
  )?.driverAdapterError?.cause;
  const index = cause?.constraint?.index;
  if (!index || !cause?.table) return undefined;

  const field = index.replace(`${cause.table}_`, '').replace(/_key$/, '');
  return field ? field.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()) : undefined;
}
