import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  MAX_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  type Product,
  type ProductImageUpdate,
} from '@repo/shared';
import { randomUUID } from 'node:crypto';
import { invalidField } from '../../common/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { detectImageType } from '../../storage/image-type.js';
import { extensionFor, StorageService } from '../../storage/storage.js';
import { productSelect, toProduct } from './product.mapper.js';

export type ImageUpload = { buffer: Buffer; alt?: string; optionValueId?: string | null };

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(productId: string, upload: ImageUpload): Promise<Product> {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { _count: { select: { images: true } } },
    });
    if (product._count.images >= MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(`A product can have at most ${MAX_PRODUCT_IMAGES} images`);
    }
    if (upload.buffer.length > MAX_IMAGE_BYTES) {
      throw invalidField('file', 'Use an image of at most 5 MB');
    }

    const contentType = detectImageType(upload.buffer);
    if (!contentType) throw invalidField('file', 'Upload a JPEG, PNG, WebP or AVIF image');
    if (upload.optionValueId) await this.assertOptionValue(productId, upload.optionValueId);

    const storageKey = `products/${productId}/${randomUUID()}.${extensionFor(contentType)}`;
    await this.storage.put(storageKey, upload.buffer, contentType);

    try {
      const last = await this.prisma.productImage.aggregate({
        where: { productId },
        _max: { position: true },
      });
      await this.prisma.productImage.create({
        data: {
          productId,
          storageKey,
          contentType,
          size: upload.buffer.length,
          alt: upload.alt?.trim() ?? '',
          position: (last._max.position ?? -1) + 1,
          optionValueId: upload.optionValueId ?? null,
        },
      });
    } catch (error) {
      // Don't leave a stored file without a record.
      await this.deleteStored([storageKey]);
      throw error;
    }

    return this.product(productId);
  }

  async update(productId: string, imageId: string, input: ProductImageUpdate): Promise<Product> {
    if (input.optionValueId) await this.assertOptionValue(productId, input.optionValueId);

    await this.prisma.productImage.update({
      where: { id: imageId, productId },
      data: { alt: input.alt, position: input.position, optionValueId: input.optionValueId },
    });
    return this.product(productId);
  }

  async remove(productId: string, imageId: string): Promise<Product> {
    const image = await this.prisma.productImage.delete({
      where: { id: imageId, productId },
      select: { storageKey: true },
    });
    await this.deleteStored([image.storageKey]);
    return this.product(productId);
  }

  /**
   * Deletes stored files after their records are gone. Failures are logged, not
   * thrown: the record is already deleted and an orphaned file is harmless.
   */
  async deleteStored(keys: string[]): Promise<void> {
    const results = await Promise.allSettled(keys.map((key) => this.storage.delete(key)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(`Could not delete stored file ${keys[index]}: ${String(result.reason)}`);
      }
    });
  }

  /** The value must belong to one of the product's options. */
  private async assertOptionValue(productId: string, optionValueId: string): Promise<void> {
    const found = await this.prisma.optionValue.count({
      where: { id: optionValueId, optionType: { products: { some: { productId } } } },
    });
    if (!found) throw invalidField('optionValueId', "Choose one of the product's option values");
  }

  private async product(id: string): Promise<Product> {
    return toProduct(
      await this.prisma.product.findUniqueOrThrow({ where: { id }, select: productSelect }),
    );
  }
}
