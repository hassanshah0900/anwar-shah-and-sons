import { ConflictException, Injectable } from '@nestjs/common';
import {
  slugify,
  type Product,
  type ProductInput,
  type ProductList,
  type ProductListQuery,
  type ProductUpdate,
} from '@repo/shared';
import { and, asc, count, desc, eq, exists, inArray, or, sum } from 'drizzle-orm';
import { invalidField } from '../../common/zod-validation.pipe.js';
import type { Database } from '../../db/connection.js';
import { InjectDatabase } from '../../db/database.module.js';
import { containsInsensitive, found, orNotFound, touch } from '../../db/queries.js';
import {
  categories,
  optionTypes,
  productImages,
  productOptions,
  products,
  productVariants,
} from '../../db/schema/index.js';
import { ImagesService } from './images.service.js';
import { findProduct } from './product.mapper.js';

const NEEDS_VARIANT = 'Add at least one variant before publishing';

@Injectable()
export class ProductsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly images: ImagesService,
  ) {}

  async list(query: ProductListQuery): Promise<ProductList> {
    const where = and(
      query.status ? eq(products.status, query.status) : undefined,
      query.categoryId ? eq(products.categoryId, query.categoryId) : undefined,
      query.q
        ? or(
            containsInsensitive(products.name, query.q),
            exists(
              this.db
                .select({ id: productVariants.id })
                .from(productVariants)
                .where(
                  and(
                    eq(productVariants.productId, products.id),
                    containsInsensitive(productVariants.sku, query.q),
                  ),
                ),
            ),
          )
        : undefined,
    );

    const [rows, total] = await Promise.all([
      this.db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          status: products.status,
          price: products.price,
          updatedAt: products.updatedAt,
          category: { id: categories.id, name: categories.name },
        })
        .from(products)
        .innerJoin(categories, eq(categories.id, products.categoryId))
        .where(where)
        .orderBy(desc(products.updatedAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.$count(products, where),
    ]);

    const variants = rows.length
      ? await this.db
          .select({
            productId: productVariants.productId,
            count: count(),
            stock: sum(productVariants.stock).mapWith(Number),
          })
          .from(productVariants)
          .where(
            inArray(
              productVariants.productId,
              rows.map((row) => row.id),
            ),
          )
          .groupBy(productVariants.productId)
      : [];
    const byProduct = new Map(variants.map((entry) => [entry.productId, entry]));

    return {
      products: rows.map(({ updatedAt, ...row }) => ({
        ...row,
        variantCount: byProduct.get(row.id)?.count ?? 0,
        totalStock: byProduct.get(row.id)?.stock ?? 0,
        updatedAt: updatedAt.toISOString(),
      })),
      total,
    };
  }

  get(id: string): Promise<Product> {
    return findProduct(this.db, id);
  }

  async create(input: ProductInput): Promise<Product> {
    // A new product has no variants yet, so it can't be published straight away.
    if (input.status === 'active') throw invalidField('status', NEEDS_VARIANT);
    await this.assertCategory(input.categoryId);
    await this.assertOptionTypes(input.optionTypeIds);

    return this.db.transaction(async (tx) => {
      const { id } = found(
        await tx
          .insert(products)
          .values({
            name: input.name,
            slug: input.slug ?? slugify(input.name),
            description: input.description ?? null,
            categoryId: input.categoryId,
            status: input.status,
            price: input.price,
            compareAtPrice: input.compareAtPrice ?? null,
          })
          .returning({ id: products.id }),
      );
      if (input.optionTypeIds.length) {
        await tx.insert(productOptions).values(
          input.optionTypeIds.map((optionTypeId, position) => ({
            productId: id,
            optionTypeId,
            position,
          })),
        );
      }
      return findProduct(tx, id);
    });
  }

  async update(id: string, input: ProductUpdate): Promise<Product> {
    const current = orNotFound(
      await this.db.query.products.findFirst({
        where: eq(products.id, id),
        columns: { price: true, compareAtPrice: true },
        with: {
          options: { columns: { optionTypeId: true }, orderBy: [asc(productOptions.position)] },
        },
      }),
    );
    const hasVariants =
      (await this.db.$count(productVariants, eq(productVariants.productId, id))) > 0;

    if (input.status === 'active' && !hasVariants) throw invalidField('status', NEEDS_VARIANT);
    if (input.categoryId) await this.assertCategory(input.categoryId);

    const price = input.price ?? current.price;
    const compareAtPrice =
      input.compareAtPrice === undefined ? current.compareAtPrice : input.compareAtPrice;
    if (compareAtPrice != null && compareAtPrice <= price) {
      throw invalidField('compareAtPrice', 'The compare-at price must be higher than the price');
    }

    const optionTypeIds = input.optionTypeIds;
    const optionsChanged =
      optionTypeIds !== undefined &&
      optionTypeIds.join() !== current.options.map((option) => option.optionTypeId).join();
    if (optionsChanged && hasVariants) {
      throw new ConflictException("Remove the variants before changing the product's options");
    }
    if (optionsChanged) await this.assertOptionTypes(optionTypeIds);

    return this.db.transaction(async (tx) => {
      if (optionsChanged) {
        await tx.delete(productOptions).where(eq(productOptions.productId, id));
        if (optionTypeIds.length) {
          await tx.insert(productOptions).values(
            optionTypeIds.map((optionTypeId, position) => ({
              productId: id,
              optionTypeId,
              position,
            })),
          );
        }
      }
      found(
        await tx
          .update(products)
          .set(
            touch({
              name: input.name,
              slug: input.slug,
              description: input.description,
              categoryId: input.categoryId,
              status: input.status,
              price: input.price,
              compareAtPrice: input.compareAtPrice,
            }),
          )
          .where(eq(products.id, id))
          .returning({ id: products.id }),
      );
      return findProduct(tx, id);
    });
  }

  /** Deletes the product, its variants and images, then the stored image files. */
  async remove(id: string): Promise<void> {
    const keys = await this.db.transaction(async (tx) => {
      const images = await tx
        .select({ storageKey: productImages.storageKey })
        .from(productImages)
        .where(eq(productImages.productId, id));
      found(await tx.delete(products).where(eq(products.id, id)).returning({ id: products.id }));
      return images.map((image) => image.storageKey);
    });
    await this.images.deleteStored(keys);
  }

  private async assertCategory(id: string): Promise<void> {
    const count = await this.db.$count(categories, eq(categories.id, id));
    if (!count) throw invalidField('categoryId', 'Choose an existing category');
  }

  private async assertOptionTypes(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const count = await this.db.$count(optionTypes, inArray(optionTypes.id, ids));
    if (count !== ids.length) throw invalidField('optionTypeIds', 'Choose existing options');
  }
}
