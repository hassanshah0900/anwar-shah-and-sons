import { Injectable, NotFoundException } from '@nestjs/common';
import {
  stockLevel,
  type Category,
  type Facet,
  type ProductCard,
  type ProductDetail,
  type ProductListing,
  type ProductListingQuery,
} from '@repo/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type CategoryNode = Pick<Category, 'id' | 'name' | 'slug' | 'parentId'>;

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  images: {
    select: { storageKey: true, alt: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    take: 1,
  },
  variants: {
    select: {
      price: true,
      stock: true,
      optionValues: {
        select: {
          optionValue: {
            select: {
              label: true,
              slug: true,
              colorHex: true,
              position: true,
              optionType: { select: { kind: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

/** Read-only, public view of the catalog: only active products are visible. */
@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  categories(): Promise<Category[]> {
    return this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        position: true,
      },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async listProducts(query: ProductListingQuery): Promise<ProductListing> {
    const scope: Prisma.ProductWhereInput = {
      status: 'active',
      ...(query.category && { categoryId: { in: await this.categoryScope(query.category) } }),
      ...(query.q && { name: { contains: query.q, mode: 'insensitive' } }),
    };
    const where: Prisma.ProductWhereInput = {
      ...scope,
      AND: [
        ...optionFilters(query.option),
        ...(query.minPrice !== undefined ? [{ price: { gte: query.minPrice } }] : []),
        ...(query.maxPrice !== undefined ? [{ price: { lte: query.maxPrice } }] : []),
      ],
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'price-asc'
        ? [{ price: 'asc' }, { createdAt: 'desc' }]
        : query.sort === 'price-desc'
          ? [{ price: 'desc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];

    const [rows, total, facets, price] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: cardSelect,
        orderBy,
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.product.count({ where }),
      this.facets(scope),
      this.prisma.product.aggregate({ where: scope, _min: { price: true }, _max: { price: true } }),
    ]);

    return {
      products: rows.map(toCard),
      total,
      facets,
      price:
        price._min.price === null || price._max.price === null
          ? null
          : { min: price._min.price, max: price._max.price },
    };
  }

  async product(slug: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'active' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        compareAtPrice: true,
        categoryId: true,
        options: {
          orderBy: { position: 'asc' },
          select: {
            optionType: {
              select: {
                name: true,
                slug: true,
                kind: true,
                values: {
                  select: { id: true, label: true, slug: true, colorHex: true },
                  orderBy: [{ position: 'asc' }, { label: 'asc' }],
                },
              },
            },
          },
        },
        variants: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            price: true,
            stock: true,
            optionValues: { select: { optionValueId: true } },
          },
        },
        images: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: { storageKey: true, alt: true, optionValueId: true },
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
    return this.prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
    });
  }

  /** Option values used by variants of products in scope, grouped by option. */
  private async facets(scope: Prisma.ProductWhereInput): Promise<Facet[]> {
    const values = await this.prisma.optionValue.findMany({
      where: { variants: { some: { variant: { product: scope } } } },
      select: {
        label: true,
        slug: true,
        colorHex: true,
        optionType: { select: { name: true, slug: true, kind: true, position: true } },
      },
      orderBy: [{ optionType: { position: 'asc' } }, { position: 'asc' }, { label: 'asc' }],
    });

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
function optionFilters(filters: string[]): Prisma.ProductWhereInput[] {
  const byOption = new Map<string, string[]>();
  for (const filter of filters) {
    const [option = '', value = ''] = filter.split(':');
    byOption.set(option, [...(byOption.get(option) ?? []), value]);
  }

  return [...byOption].map(([option, values]) => ({
    variants: {
      some: {
        optionValues: {
          some: { optionValue: { slug: { in: values }, optionType: { slug: option } } },
        },
      },
    },
  }));
}

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
  };
}
