import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  addressInputSchema,
  addressUpdateSchema,
  type Address,
  type AddressInputParsed,
  type AddressList,
  type AddressUpdate,
} from '@repo/shared';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AddressesService } from './addresses.service.js';

/** The signed-in customer's address book. Requires a session. */
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  async list(@Session() session: UserSession<Auth>): Promise<AddressList> {
    return { addresses: await this.addresses.list(session.user.id) };
  }

  @Post()
  create(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(addressInputSchema)) input: AddressInputParsed,
  ): Promise<Address> {
    return this.addresses.create(session.user.id, input);
  }

  @Patch(':id')
  update(
    @Session() session: UserSession<Auth>,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addressUpdateSchema)) input: AddressUpdate,
  ): Promise<Address> {
    return this.addresses.update(session.user.id, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Session() session: UserSession<Auth>, @Param('id') id: string): Promise<void> {
    await this.addresses.remove(session.user.id, id);
  }
}
