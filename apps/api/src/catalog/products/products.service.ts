import { ConflictException, Injectable } from '@nestjs/common';
import {
  slugify,
  type Product,
  type ProductInput,
  type ProductList,
  type ProductListQuery,
  type ProductUpdate,
} from '@repo/shared';
import { invalidField } from '../../common/zod-validation.pipe.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ImagesService } from './images.service.js';
import { productSelect, toProduct } from './product.mapper.js';

const NEEDS_VARIANT = 'Add at least one variant before publishing';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
  ) {}

  async list(query: ProductListQuery): Promise<ProductList> {
    const where: Prisma.ProductWhereInput = {
      status: query.status,
      categoryId: query.categoryId,
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: query.q, mode: 'insensitive' } } } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          price: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          _count: { select: { variants: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    const stock = await this.prisma.productVariant.groupBy({
      by: ['productId'],
      where: { productId: { in: rows.map((row) => row.id) } },
      _sum: { stock: true },
    });
    const stockById = new Map(stock.map((entry) => [entry.productId, entry._sum.stock ?? 0]));

    return {
      products: rows.map(({ _count, updatedAt, ...row }) => ({
        ...row,
        variantCount: _count.variants,
        totalStock: stockById.get(row.id) ?? 0,
        updatedAt: updatedAt.toISOString(),
      })),
      total,
    };
  }

  async get(id: string): Promise<Product> {
    return toProduct(
      await this.prisma.product.findUniqueOrThrow({ where: { id }, select: productSelect }),
    );
  }

  async create(input: ProductInput): Promise<Product> {
    // A new product has no variants yet, so it can't be published straight away.
    if (input.status === 'active') throw invalidField('status', NEEDS_VARIANT);
    await this.assertCategory(input.categoryId);
    await this.assertOptionTypes(input.optionTypeIds);

    const row = await this.prisma.product.create({
      select: productSelect,
      data: {
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        description: input.description ?? null,
        categoryId: input.categoryId,
        status: input.status,
        price: input.price,
        compareAtPrice: input.compareAtPrice ?? null,
        options: {
          create: input.optionTypeIds.map((optionTypeId, position) => ({ optionTypeId, position })),
        },
      },
    });
    return toProduct(row);
  }

  async update(id: string, input: ProductUpdate): Promise<Product> {
    const current = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      select: {
        price: true,
        compareAtPrice: true,
        options: { select: { optionTypeId: true }, orderBy: { position: 'asc' } },
        _count: { select: { variants: true } },
      },
    });
    const hasVariants = current._count.variants > 0;

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

    const row = await this.prisma.$transaction(async (tx) => {
      if (optionsChanged) {
        await tx.productOption.deleteMany({ where: { productId: id } });
        await tx.productOption.createMany({
          data: optionTypeIds.map((optionTypeId, position) => ({
            productId: id,
            optionTypeId,
            position,
          })),
        });
      }
      return tx.product.update({
        where: { id },
        select: productSelect,
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          categoryId: input.categoryId,
          status: input.status,
          price: input.price,
          compareAtPrice: input.compareAtPrice,
        },
      });
    });
    return toProduct(row);
  }

  /** Deletes the product, its variants and images, then the stored image files. */
  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.delete({
      where: { id },
      select: { images: { select: { storageKey: true } } },
    });
    await this.images.deleteStored(product.images.map((image) => image.storageKey));
  }

  private async assertCategory(id: string): Promise<void> {
    const found = await this.prisma.category.count({ where: { id } });
    if (!found) throw invalidField('categoryId', 'Choose an existing category');
  }

  private async assertOptionTypes(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const found = await this.prisma.optionType.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw invalidField('optionTypeIds', 'Choose existing options');
  }
}
