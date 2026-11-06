import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MAX_ADDRESSES,
  type Address,
  type AddressInputParsed,
  type AddressUpdate,
  type ShippingAddress,
} from '@repo/shared';
import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { InjectDatabase } from '../db/database.module.js';
import { found, touch, type Queryable } from '../db/queries.js';
import { addresses } from '../db/schema/index.js';

const addressColumns = {
  id: addresses.id,
  fullName: addresses.fullName,
  phone: addresses.phone,
  line1: addresses.line1,
  line2: addresses.line2,
  city: addresses.city,
  postalCode: addresses.postalCode,
  isDefault: addresses.isDefault,
};

/** Default first, then the most recently added. */
const addressOrder = [desc(addresses.isDefault), desc(addresses.createdAt)];

/** A customer's address book. Every method is scoped to that customer. */
@Injectable()
export class AddressesService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  list(userId: string): Promise<Address[]> {
    return this.db
      .select(addressColumns)
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(...addressOrder);
  }

  /** Adds an address. The first one becomes the default. */
  async create(userId: string, input: AddressInputParsed): Promise<Address> {
    return this.db.transaction(async (tx) => {
      const count = await tx.$count(addresses, eq(addresses.userId, userId));
      if (count >= MAX_ADDRESSES) {
        throw new ConflictException(`You can save up to ${MAX_ADDRESSES} addresses`);
      }
      const isDefault = count === 0 || input.isDefault === true;
      if (isDefault) await clearDefault(tx, userId);

      const { isDefault: _ignored, ...fields } = input;
      return found(
        await tx
          .insert(addresses)
          .values({ ...fields, userId, isDefault })
          .returning(addressColumns),
      );
    });
  }

  async update(userId: string, id: string, input: AddressUpdate): Promise<Address> {
    return this.db.transaction(async (tx) => {
      await findOwned(tx, userId, id);
      if (input.isDefault) await clearDefault(tx, userId);
      return found(
        await tx
          .update(addresses)
          .set(touch(input))
          .where(eq(addresses.id, id))
          .returning(addressColumns),
      );
    });
  }

  /** Deletes an address; if it was the default, the most recent remaining one takes over. */
  async remove(userId: string, id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const address = await findOwned(tx, userId, id);
      await tx.delete(addresses).where(eq(addresses.id, id));
      if (!address.isDefault) return;

      const [next] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.createdAt))
        .limit(1);
      if (next) {
        await tx
          .update(addresses)
          .set(touch({ isDefault: true }))
          .where(eq(addresses.id, next.id));
      }
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

async function findOwned(tx: Queryable, userId: string, id: string) {
  const [address] = await tx
    .select({ id: addresses.id, isDefault: addresses.isDefault })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  // Someone else's address is reported as missing, not forbidden.
  if (!address) throw new NotFoundException('Address not found');
  return address;
}

function clearDefault(tx: Queryable, userId: string) {
  return tx
    .update(addresses)
    .set(touch({ isDefault: false }))
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
}

const normalise = (value: string | null) => (value ?? '').trim().toLowerCase();

function sameAddress(a: ShippingAddress, b: ShippingAddress): boolean {
  return (['fullName', 'phone', 'line1', 'line2', 'city', 'postalCode'] as const).every(
    (key) => normalise(a[key]) === normalise(b[key]),
  );
}
