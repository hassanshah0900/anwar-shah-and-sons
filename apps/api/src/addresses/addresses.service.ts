import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MAX_ADDRESSES,
  type Address,
  type AddressInputParsed,
  type AddressUpdate,
  type ShippingAddress,
} from '@repo/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const addressSelect = {
  id: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  postalCode: true,
  isDefault: true,
} satisfies Prisma.AddressSelect;

/** Default first, then the most recently added. */
const addressOrder: Prisma.AddressOrderByWithRelationInput[] = [
  { isDefault: 'desc' },
  { createdAt: 'desc' },
];

/** A customer's address book. Every method is scoped to that customer. */
@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      select: addressSelect,
      orderBy: addressOrder,
    });
  }

  /** Adds an address. The first one becomes the default. */
  async create(userId: string, input: AddressInputParsed): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      if (count >= MAX_ADDRESSES) {
        throw new ConflictException(`You can save up to ${MAX_ADDRESSES} addresses`);
      }
      const isDefault = count === 0 || input.isDefault === true;
      if (isDefault) await clearDefault(tx, userId);

      const { isDefault: _ignored, ...fields } = input;
      return tx.address.create({
        data: { ...fields, userId, isDefault },
        select: addressSelect,
      });
    });
  }

  async update(userId: string, id: string, input: AddressUpdate): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      await findOwned(tx, userId, id);
      if (input.isDefault) await clearDefault(tx, userId);
      return tx.address.update({ where: { id }, data: input, select: addressSelect });
    });
  }

  /** Deletes an address; if it was the default, the most recent remaining one takes over. */
  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const address = await findOwned(tx, userId, id);
      await tx.address.delete({ where: { id } });
      if (!address.isDefault) return;

      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    });
  }

  /**
   * Saves an address used at checkout unless the book already has it or is
   * full. Best effort: it never fails the order that triggered it.
   */
  async saveFromCheckout(userId: string, address: ShippingAddress): Promise<void> {
    const existing = await this.list(userId);
    if (existing.length >= MAX_ADDRESSES) return;
    if (existing.some((saved) => sameAddress(saved, address))) return;
    await this.create(userId, address);
  }
}

async function findOwned(tx: Prisma.TransactionClient, userId: string, id: string) {
  const address = await tx.address.findFirst({
    where: { id, userId },
    select: { id: true, isDefault: true },
  });
  // Someone else's address is reported as missing, not forbidden.
  if (!address) throw new NotFoundException('Address not found');
  return address;
}

function clearDefault(tx: Prisma.TransactionClient, userId: string) {
  return tx.address.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  });
}

const normalise = (value: string | null) => (value ?? '').trim().toLowerCase();

function sameAddress(a: ShippingAddress, b: ShippingAddress): boolean {
  return (['fullName', 'phone', 'line1', 'line2', 'city', 'postalCode'] as const).every(
    (key) => normalise(a[key]) === normalise(b[key]),
  );
}
