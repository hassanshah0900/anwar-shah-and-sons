import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Product, VariantInput, VariantUpdate } from '@repo/shared';
import { invalidField } from '../../common/zod-validation.pipe.js';
import { and, asc, eq, inArray, like } from 'drizzle-orm';
import type { Database } from '../../db/connection.js';
import { InjectDatabase } from '../../db/database.module.js';
import { found, nextPosition, orNotFound, type Queryable, touch } from '../../db/queries.js';
import {
  optionValues,
  productOptions,
  products,
  productVariants,
  variantOptionValues,
} from '../../db/schema/index.js';
import { findProduct } from './product.mapper.js';

/** Generating more variants than this at once is almost certainly a mistake. */
export const MAX_GENERATED_VARIANTS = 100;
const MAX_SKU_LENGTH = 64;

/** Identifies a variant's combination regardless of value order. */
export function combinationKey(optionValueIds: string[]): string {
  return [...optionValueIds].sort().join('+');
}

/** Every combination of one value per option, in option and value order. */
export function cartesian<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>(
    (combinations, list) => combinations.flatMap((combo) => list.map((item) => [...combo, item])),
    [[]],
  );
}

/** SKU from slugs, e.g. lawn-kurta + [m, black] -> LAWN-KURTA-M-BLACK. */
export function skuFor(productSlug: string, valueSlugs: string[]): string {
  return [productSlug, ...valueSlugs]
    .join('-')
    .toUpperCase()
    .slice(0, MAX_SKU_LENGTH)
    .replace(/-+$/, '');
}

@Injectable()
export class VariantsService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async create(productId: string, input: VariantInput): Promise<Product> {
    const optionTypeIds = await this.optionTypeIdsOf(productId);
    await this.assertOneValuePerOption(optionTypeIds, input.optionValueIds);

    const key = combinationKey(input.optionValueIds);
    const exists = await this.db.$count(
      productVariants,
      and(eq(productVariants.productId, productId), eq(productVariants.combinationKey, key)),
    );
    if (exists) throw invalidField('optionValueIds', 'This combination already exists');

    return this.db.transaction(async (tx) => {
      await insertVariant(tx, {
        productId,
        sku: input.sku,
        price: input.price ?? null,
        stock: input.stock,
        position: await nextPosition(tx, productVariants, eq(productVariants.productId, productId)),
        combinationKey: key,
        optionValueIds: input.optionValueIds,
      });
      return findProduct(tx, productId);
    });
  }

  async update(productId: string, variantId: string, input: VariantUpdate): Promise<Product> {
    found(
      await this.db
        .update(productVariants)
        .set(touch({ sku: input.sku, price: input.price, stock: input.stock }))
        .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
        .returning({ id: productVariants.id }),
    );
    return findProduct(this.db, productId);
  }

  async remove(productId: string, variantId: string): Promise<Product> {
    const product = orNotFound(
      await this.db.query.products.findFirst({
        where: eq(products.id, productId),
        columns: { status: true },
      }),
    );
    const variantCount = await this.db.$count(
      productVariants,
      eq(productVariants.productId, productId),
    );
    if (product.status === 'active' && variantCount <= 1) {
      throw new ConflictException(
        'An active product needs a variant. Unpublish it before removing the last one.',
      );
    }

    found(
      await this.db
        .delete(productVariants)
        .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
        .returning({ id: productVariants.id }),
    );
    return findProduct(this.db, productId);
  }

  /** Creates every combination of the product's option values that doesn't exist yet. */
  async generate(productId: string): Promise<Product> {
    const product = orNotFound(
      await this.db.query.products.findFirst({
        where: eq(products.id, productId),
        columns: { slug: true },
        with: {
          options: {
            columns: {},
            orderBy: [asc(productOptions.position)],
            with: {
              optionType: {
                columns: { name: true },
                with: {
                  values: {
                    columns: { id: true, slug: true },
                    orderBy: [asc(optionValues.position), asc(optionValues.label)],
                  },
                },
              },
            },
          },
          variants: { columns: { combinationKey: true } },
        },
      }),
    );

    const valueLists = product.options.map((option) => option.optionType.values);
    const empty = product.options.find((option) => option.optionType.values.length === 0);
    if (empty) throw new BadRequestException(`Add values to ${empty.optionType.name} first`);

    const existing = new Set(product.variants.map((variant) => variant.combinationKey));
    const missing = cartesian(valueLists).filter(
      (combo) => !existing.has(combinationKey(combo.map((value) => value.id))),
    );
    if (existing.size + missing.length > MAX_GENERATED_VARIANTS) {
      throw new BadRequestException(
        `That would create more than ${MAX_GENERATED_VARIANTS} variants. Use fewer option values.`,
      );
    }

    return this.db.transaction(async (tx) => {
      const prefix = product.slug.toUpperCase().replace(/[\\%_]/g, '\\$&');
      const taken = new Set(
        (
          await tx
            .select({ sku: productVariants.sku })
            .from(productVariants)
            .where(like(productVariants.sku, `${prefix}%`))
        ).map((variant) => variant.sku),
      );
      let position = await nextPosition(
        tx,
        productVariants,
        eq(productVariants.productId, productId),
      );

      for (const combo of missing) {
        await insertVariant(tx, {
          productId,
          sku: uniqueSku(
            skuFor(
              product.slug,
              combo.map((value) => value.slug),
            ),
            taken,
          ),
          price: null,
          stock: 0,
          position: position++,
          combinationKey: combinationKey(combo.map((value) => value.id)),
          optionValueIds: combo.map((value) => value.id),
        });
      }
      return findProduct(tx, productId);
    });
  }

  private async optionTypeIdsOf(productId: string): Promise<string[]> {
    const product = orNotFound(
      await this.db.query.products.findFirst({
        where: eq(products.id, productId),
        columns: {},
        with: { options: { columns: { optionTypeId: true } } },
      }),
    );
    return product.options.map((option) => option.optionTypeId);
  }

  private async assertOneValuePerOption(optionTypeIds: string[], valueIds: string[]) {
    const values = valueIds.length
      ? await this.db
          .select({ optionTypeId: optionValues.optionTypeId })
          .from(optionValues)
          .where(inArray(optionValues.id, valueIds))
      : [];
    const types = values.map((value) => value.optionTypeId);
    const valid =
      values.length === valueIds.length &&
      types.length === optionTypeIds.length &&
      new Set(types).size === types.length &&
      types.every((type) => optionTypeIds.includes(type));
    if (!valid) throw invalidField('optionValueIds', 'Choose one value for each option');
  }
}

type NewVariant = typeof productVariants.$inferInsert & { optionValueIds: string[] };

/** Inserts a variant with the option values that define it. */
async function insertVariant(tx: Queryable, { optionValueIds, ...variant }: NewVariant) {
  const { id } = found(
    await tx.insert(productVariants).values(variant).returning({ id: productVariants.id }),
  );
  if (optionValueIds.length) {
    await tx
      .insert(variantOptionValues)
      .values(optionValueIds.map((optionValueId) => ({ variantId: id, optionValueId })));
  }
}

function uniqueSku(base: string, taken: Set<string>): string {
  let sku = base;
  for (let n = 2; taken.has(sku); n++) {
    const suffix = `-${n}`;
    sku = base.slice(0, MAX_SKU_LENGTH - suffix.length) + suffix;
  }
  taken.add(sku);
  return sku;
}
