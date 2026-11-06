import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import type { Response } from 'express';
import pg from 'pg';

/**
 * Maps database errors that callers can act on to HTTP responses, so services can rely on
 * constraints instead of racing "check then write" queries. Drizzle wraps the driver's error
 * in a DrizzleQueryError; raw driver errors are handled the same way.
 */
@Catch(DrizzleQueryError, pg.DatabaseError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(error: DrizzleQueryError | pg.DatabaseError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const cause = error instanceof pg.DatabaseError ? error : error.cause;
    const { status, message } = map(cause instanceof pg.DatabaseError ? cause : undefined);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Unhandled database error: ${String(cause ?? error)}`, error.stack);
    }

    response.status(status).json({ statusCode: status, message });
  }
}

// https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

function map(error: pg.DatabaseError | undefined): { status: number; message: string } {
  switch (error?.code) {
    case UNIQUE_VIOLATION: {
      const field = uniqueField(error);
      return {
        status: HttpStatus.CONFLICT,
        message: field ? `${field} is already in use` : 'This record already exists',
      };
    }
    case FOREIGN_KEY_VIOLATION:
      return {
        status: HttpStatus.CONFLICT,
        message: 'This record is in use or refers to something that does not exist',
      };
    default:
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}

/** Labels for fields whose name reads badly, such as abbreviations. */
const FIELD_LABELS: Record<string, string> = { sku: 'SKU' };

/**
 * The field a unique violation is about, from the index name. Unique indexes are named
 * `<table>_<field>_key`; composite ones follow the same pattern for the field people can
 * change (e.g. option_values_slug_key).
 */
function uniqueField(error: pg.DatabaseError): string | undefined {
  if (!error.constraint || !error.table) return undefined;
  const field = error.constraint.replace(`${error.table}_`, '').replace(/_key$/, '');
  if (!field || field === error.constraint) return undefined;
  return FIELD_LABELS[field] ?? field.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
}
