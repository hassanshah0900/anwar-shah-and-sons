import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ratingSummary,
  stockLevel,
  type Category,
  type Facet,
  type ProductCard,
  type ProductDetail,
  type ProductListing,
  type ProductListingQuery,
} from '@repo/shared';
import { and, asc, desc, eq, exists, gt, gte, inArray, lte, max, min, type SQL } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { InjectDatabase } from '../db/database.module.js';
import { containsInsensitive } from '../db/queries.js';
import {
  categories,
  optionTypes,
  optionValues,
  productImages,
  productOptions,
  products,
  productVariants,
  variantOptionValues,
} from '../db/schema/index.js';

type CategoryNode = Pick<Category, 'id' | 'name' | 'slug' | 'parentId'>;

/** Read-only, public view of the catalog: only active products are visible. */
@Injectable()
export class StorefrontService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  categories(): Promise<Category[]> {
    return this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        parentId: categories.parentId,
        position: categories.position,
      })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.name));
  }

  async listProducts(query: ProductListingQuery): Promise<ProductListing> {
    const scope = and(
      eq(products.status, 'active'),
      query.category
        ? inArray(products.categoryId, await this.categoryScope(query.category))
        : undefined,
      query.q ? containsInsensitive(products.name, query.q) : undefined,
    );
    const where = and(
      scope,
      ...optionFilters(this.db, query.option),
      query.minPrice !== undefined ? gte(products.price, query.minPrice) : undefined,
      query.maxPrice !== undefined ? lte(products.price, query.maxPrice) : undefined,
      query.onSale ? gt(products.compareAtPrice, products.price) : undefined,
    );
    const orderBy =
      query.sort === 'price-asc'
        ? [asc(products.price), desc(products.createdAt)]
        : query.sort === 'price-desc'
          ? [desc(products.price), desc(products.createdAt)]
          : [desc(products.createdAt)];

    const [page, total, facets, [price]] = await Promise.all([
      this.db
        .select({ id: products.id })
        .from(products)
        .where(where)
        .orderBy(...orderBy, asc(products.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.$count(products, where),
      this.facets(scope),
      this.db
        .select({ min: min(products.price), max: max(products.price) })
        .from(products)
        .where(scope),
    ]);

    return {
      products: await this.cards(page.map((row) => row.id)),
      total,
      facets,
      price: price?.min == null || price.max == null ? null : { min: price.min, max: price.max },
    };
  }

  async product(slug: string): Promise<ProductDetail> {
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.status, 'active')),
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        compareAtPrice: true,
        reviewCount: true,
        ratingTotal: true,
        categoryId: true,
      },
      with: {
        options: {
          columns: {},
          orderBy: [asc(productOptions.position)],
          with: {
            optionType: {
              columns: { name: true, slug: true, kind: true },
              with: {
                values: {
                  columns: { id: true, label: true, slug: true, colorHex: true },
                  orderBy: [asc(optionValues.position), asc(optionValues.label)],
                },
              },
            },
          },
        },
        variants: {
          columns: { id: true, price: true, stock: true },
          orderBy: [asc(productVariants.position), asc(productVariants.createdAt)],
          with: { optionValues: { columns: { optionValueId: true } } },
        },
        images: {
          columns: { storageKey: true, alt: true, optionValueId: true },
          orderBy: [asc(productImages.position), asc(productImages.createdAt)],
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const used = new Set(
      product.variants.flatMap((variant) =>
        variant.optionValues.map((value) => value.optionValueId),
      ),
    );

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      rating: ratingSummary(product.reviewCount, product.ratingTotal),
      breadcrumbs: await this.breadcrumbs(product.categoryId),
      options: product.options.map(({ optionType }) => ({
        name: optionType.name,
        slug: optionType.slug,
        kind: optionType.kind,
        values: optionType.values.filter((value) => used.has(value.id)),
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        optionValueIds: variant.optionValues.map((value) => value.optionValueId),
        price: variant.price ?? product.price,
        stockLevel: stockLevel(variant.stock),
      })),
      images: product.images.map(({ storageKey, ...image }) => ({ key: storageKey, ...image })),
    };
  }

  /** Cards for these products, in the order given. */
  private async cards(ids: string[]): Promise<ProductCard[]> {
    if (!ids.length) return [];
    const rows = await this.db.query.products.findMany({
      where: inArray(products.id, ids),
      columns: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        reviewCount: true,
        ratingTotal: true,
      },
      with: {
        images: {
          columns: { storageKey: true, alt: true },
          orderBy: [asc(productImages.position), asc(productImages.createdAt)],
          limit: 1,
        },
        variants: {
          columns: { price: true, stock: true },
          with: {
            optionValues: {
              columns: {},
              with: {
                optionValue: {
                  columns: { label: true, slug: true, colorHex: true, position: true },
                  with: { optionType: { columns: { kind: true } } },
                },
              },
            },
          },
        },
      },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [toCard(row)] : [];
    });
  }

  /** The category with this slug and all of its descendants. */
  private async categoryScope(slug: string): Promise<string[]> {
    const all = await this.allCategories();
    const root = all.find((category) => category.slug === slug);
    if (!root) throw new NotFoundException('Category not found');

    const ids = new Set([root.id]);
    for (let grew = true; grew;) {
      grew = false;
      for (const category of all) {
        if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
          ids.add(category.id);
          grew = true;
        }
      }
    }
    return [...ids];
  }

  private async breadcrumbs(categoryId: string): Promise<ProductDetail['breadcrumbs']> {
    const byId = new Map((await this.allCategories()).map((category) => [category.id, category]));
    const trail: ProductDetail['breadcrumbs'] = [];
    for (let current = byId.get(categoryId); current; current = byId.get(current.parentId ?? '')) {
      trail.unshift({ name: current.name, slug: current.slug });
      if (trail.length > 10) break;
    }
    return trail;
  }

  private allCategories(): Promise<CategoryNode[]> {
    return this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
      })
      .from(categories);
  }

  /** Option values used by variants of products in scope, grouped by option. */
  private async facets(scope: SQL | undefined): Promise<Facet[]> {
    const usedInScope = this.db
      .select({ id: variantOptionValues.optionValueId })
      .from(variantOptionValues)
      .innerJoin(productVariants, eq(productVariants.id, variantOptionValues.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(variantOptionValues.optionValueId, optionValues.id), scope));

    const values = await this.db
      .select({
        label: optionValues.label,
        slug: optionValues.slug,
        colorHex: optionValues.colorHex,
        optionType: {
          name: optionTypes.name,
          slug: optionTypes.slug,
          kind: optionTypes.kind,
        },
      })
      .from(optionValues)
      .innerJoin(optionTypes, eq(optionTypes.id, optionValues.optionTypeId))
      .where(exists(usedInScope))
      .orderBy(asc(optionTypes.position), asc(optionValues.position), asc(optionValues.label));

    const facets = new Map<string, Facet>();
    for (const { optionType, ...value } of values) {
      const facet = facets.get(optionType.slug) ?? {
        name: optionType.name,
        slug: optionType.slug,
        kind: optionType.kind,
        values: [],
      };
      facet.values.push(value);
      facets.set(optionType.slug, facet);
    }
    return [...facets.values()];
  }
}

/** Values of one option are alternatives; different options must all match. */
function optionFilters(db: Database, filters: string[]): SQL[] {
  const byOption = new Map<string, string[]>();
  for (const filter of filters) {
    const [option = '', value = ''] = filter.split(':');
    byOption.set(option, [...(byOption.get(option) ?? []), value]);
  }

  return [...byOption].map(([option, values]) =>
    exists(
      db
        .select({ id: productVariants.id })
        .from(productVariants)
        .innerJoin(variantOptionValues, eq(variantOptionValues.variantId, productVariants.id))
        .innerJoin(optionValues, eq(optionValues.id, variantOptionValues.optionValueId))
        .innerJoin(optionTypes, eq(optionTypes.id, optionValues.optionTypeId))
        .where(
          and(
            eq(productVariants.productId, products.id),
            inArray(optionValues.slug, values),
            eq(optionTypes.slug, option),
          ),
        ),
    ),
  );
}

type CardRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  reviewCount: number;
  ratingTotal: number;
  images: { storageKey: string; alt: string }[];
  variants: {
    price: number | null;
    stock: number;
    optionValues: {
      optionValue: {
        label: string;
        slug: string;
        colorHex: string | null;
        position: number;
        optionType: { kind: 'text' | 'color' };
      };
    }[];
  }[];
};

function toCard(row: CardRow): ProductCard {
  const prices = row.variants.map((variant) => variant.price ?? row.price);
  const colors = new Map<
    string,
    { label: string; slug: string; colorHex: string | null; position: number }
  >();
  for (const variant of row.variants) {
    for (const { optionValue } of variant.optionValues) {
      if (optionValue.optionType.kind === 'color') colors.set(optionValue.slug, optionValue);
    }
  }
  const image = row.images[0];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceFrom: prices.length ? Math.min(...prices) : row.price,
    priceTo: prices.length ? Math.max(...prices) : row.price,
    compareAtPrice: row.compareAtPrice,
    image: image ? { key: image.storageKey, alt: image.alt } : null,
    colors: [...colors.values()]
      .sort((a, b) => a.position - b.position)
      .map(({ label, slug, colorHex }) => ({ label, slug, colorHex })),
    inStock: row.variants.some((variant) => variant.stock > 0),
    rating: ratingSummary(row.reviewCount, row.ratingTotal),
  };
}
