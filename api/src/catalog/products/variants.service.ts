import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Product, VariantInput, VariantUpdate } from '@repo/shared';
import { invalidField } from '../../common/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { productSelect, toProduct } from './product.mapper.js';

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
  constructor(private readonly prisma: PrismaService) {}

  async create(productId: string, input: VariantInput): Promise<Product> {
    const optionTypeIds = await this.optionTypeIdsOf(productId);
    await this.assertOneValuePerOption(optionTypeIds, input.optionValueIds);

    const key = combinationKey(input.optionValueIds);
    const exists = await this.prisma.productVariant.count({
      where: { productId, combinationKey: key },
    });
    if (exists) throw invalidField('optionValueIds', 'This combination already exists');

    await this.prisma.productVariant.create({
      data: {
        productId,
        sku: input.sku,
        price: input.price ?? null,
        stock: input.stock,
        position: await this.nextPosition(productId),
        combinationKey: key,
        optionValues: {
          create: input.optionValueIds.map((optionValueId) => ({ optionValueId })),
        },
      },
    });
    return this.product(productId);
  }

  async update(productId: string, variantId: string, input: VariantUpdate): Promise<Product> {
    await this.prisma.productVariant.update({
      where: { id: variantId, productId },
      data: { sku: input.sku, price: input.price, stock: input.stock },
    });
    return this.product(productId);
  }

  async remove(productId: string, variantId: string): Promise<Product> {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { status: true, _count: { select: { variants: true } } },
    });
    if (product.status === 'active' && product._count.variants <= 1) {
      throw new ConflictException(
        'An active product needs a variant. Unpublish it before removing the last one.',
      );
    }

    await this.prisma.productVariant.delete({ where: { id: variantId, productId } });
    return this.product(productId);
  }

  /** Creates every combination of the product's option values that doesn't exist yet. */
  async generate(productId: string): Promise<Product> {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: {
        slug: true,
        options: {
          orderBy: { position: 'asc' },
          select: {
            optionType: {
              select: {
                name: true,
                values: {
                  select: { id: true, slug: true },
                  orderBy: [{ position: 'asc' }, { label: 'asc' }],
                },
              },
            },
          },
        },
        variants: { select: { combinationKey: true } },
      },
    });

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

    const taken = new Set(
      (
        await this.prisma.productVariant.findMany({
          where: { sku: { startsWith: product.slug.toUpperCase() } },
          select: { sku: true },
        })
      ).map((variant) => variant.sku),
    );
    let position = await this.nextPosition(productId);

    await this.prisma.$transaction(
      missing.map((combo) => {
        const sku = uniqueSku(
          skuFor(
            product.slug,
            combo.map((value) => value.slug),
          ),
          taken,
        );
        return this.prisma.productVariant.create({
          data: {
            productId,
            sku,
            position: position++,
            combinationKey: combinationKey(combo.map((value) => value.id)),
            optionValues: { create: combo.map((value) => ({ optionValueId: value.id })) },
          },
        });
      }),
    );
    return this.product(productId);
  }

  private async product(id: string): Promise<Product> {
    return toProduct(
      await this.prisma.product.findUniqueOrThrow({ where: { id }, select: productSelect }),
    );
  }

  private async optionTypeIdsOf(productId: string): Promise<string[]> {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { options: { select: { optionTypeId: true } } },
    });
    return product.options.map((option) => option.optionTypeId);
  }

  private async assertOneValuePerOption(optionTypeIds: string[], valueIds: string[]) {
    const values = await this.prisma.optionValue.findMany({
      where: { id: { in: valueIds } },
      select: { optionTypeId: true },
    });
    const types = values.map((value) => value.optionTypeId);
    const valid =
      values.length === valueIds.length &&
      types.length === optionTypeIds.length &&
      new Set(types).size === types.length &&
      types.every((type) => optionTypeIds.includes(type));
    if (!valid) throw invalidField('optionValueIds', 'Choose one value for each option');
  }

  private async nextPosition(productId: string): Promise<number> {
    const last = await this.prisma.productVariant.aggregate({
      where: { productId },
      _max: { position: true },
    });
    return (last._max.position ?? -1) + 1;
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
