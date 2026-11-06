import { ArgumentsHost } from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import pg from 'pg';
import { DatabaseExceptionFilter } from './database-exception.filter.js';

describe('DatabaseExceptionFilter', () => {
  const filter = new DatabaseExceptionFilter();

  function driverError(code: string, fields: Partial<pg.DatabaseError> = {}) {
    return Object.assign(new pg.DatabaseError('db error', 0, 'error'), { code, ...fields });
  }

  function respond(error: DrizzleQueryError | pg.DatabaseError) {
    const json = vi.fn((_body: { statusCode: number; message: string }) => undefined);
    const status = vi.fn((_code: number) => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    filter.catch(error, host);
    return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
  }

  const query = (cause: Error) => new DrizzleQueryError('insert ...', [], cause);

  it('names the field of a unique violation', () => {
    const error = driverError('23505', {
      table: 'option_values',
      constraint: 'option_values_slug_key',
    });

    expect(respond(query(error))).toEqual({
      status: 409,
      body: { statusCode: 409, message: 'Slug is already in use' },
    });
  });

  it('uses a readable label where the field name is an abbreviation', () => {
    const error = driverError('23505', {
      table: 'product_variants',
      constraint: 'product_variants_sku_key',
    });

    expect(respond(query(error)).body?.message).toBe('SKU is already in use');
  });

  it('falls back to a general message when the index is unknown', () => {
    expect(respond(query(driverError('23505'))).body?.message).toBe('This record already exists');
  });

  it('maps foreign key violations to 409, wrapped or not', () => {
    expect(respond(query(driverError('23503'))).status).toBe(409);
    expect(respond(driverError('23503')).status).toBe(409);
  });

  it('hides unexpected errors behind a 500', () => {
    expect(respond(query(new Error('connect ECONNREFUSED')))).toEqual({
      status: 500,
      body: { statusCode: 500, message: 'Internal server error' },
    });
  });
});
