import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  function respond(code: string, meta?: Record<string, unknown>) {
    const json = vi.fn((_body: { statusCode: number; message: string }) => undefined);
    const status = vi.fn((_code: number) => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test', meta }),
      host,
    );
    return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
  }

  it('names the field of a unique violation', () => {
    const { status, body } = respond('P2002', {
      driverAdapterError: {
        cause: { table: 'option_values', constraint: { index: 'option_values_slug_key' } },
      },
    });

    expect(status).toBe(409);
    expect(body?.message).toBe('Slug is already in use');
  });

  it('maps foreign key violations to 409 and missing records to 404', () => {
    expect(respond('P2003').status).toBe(409);
    expect(respond('P2025').status).toBe(404);
  });

  it('hides unexpected errors behind a 500', () => {
    expect(respond('P1001')).toEqual({
      status: 500,
      body: { statusCode: 500, message: 'Internal server error' },
    });
  });
});
