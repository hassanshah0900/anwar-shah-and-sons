import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  MAX_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  type Product,
  type ProductImageUpdate,
} from '@repo/shared';
import { randomUUID } from 'node:crypto';
import { invalidField } from '../../common/zod-validation.pipe.js';
import { and, eq, exists } from 'drizzle-orm';
import type { Database } from '../../db/connection.js';
import { InjectDatabase } from '../../db/database.module.js';
import { found, nextPosition, saveOrder } from '../../db/queries.js';
import { optionValues, productImages, productOptions } from '../../db/schema/index.js';
import { detectImageType } from '../../storage/image-type.js';
import { extensionFor, StorageService } from '../../storage/storage.js';
import { assertProduct, findProduct } from './product.mapper.js';

export type ImageUpload = { buffer: Buffer; alt?: string; optionValueId?: string | null };

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly storage: StorageService,
  ) {}

  async upload(productId: string, upload: ImageUpload): Promise<Product> {
    await assertProduct(this.db, productId);
    const imageCount = await this.db.$count(productImages, eq(productImages.productId, productId));
    if (imageCount >= MAX_PRODUCT_IMAGES) {
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
      await this.db.insert(productImages).values({
        productId,
        storageKey,
        contentType,
        size: upload.buffer.length,
        alt: upload.alt?.trim() ?? '',
        position: await nextPosition(
          this.db,
          productImages,
          eq(productImages.productId, productId),
        ),
        optionValueId: upload.optionValueId ?? null,
      });
    } catch (error) {
      // Don't leave a stored file without a record.
      await this.deleteStored([storageKey]);
      throw error;
    }

    return findProduct(this.db, productId);
  }

  async update(productId: string, imageId: string, input: ProductImageUpdate): Promise<Product> {
    if (input.optionValueId) await this.assertOptionValue(productId, input.optionValueId);

    const changes = {
      alt: input.alt,
      position: input.position,
      optionValueId: input.optionValueId,
    };
    const thisImage = and(eq(productImages.id, imageId), eq(productImages.productId, productId));
    // Drizzle refuses an update with nothing to set, so an empty one only checks the image exists.
    if (Object.values(changes).every((value) => value === undefined)) {
      if (!(await this.db.$count(productImages, thisImage)))
        throw new NotFoundException('Not found');
    } else {
      found(
        await this.db
          .update(productImages)
          .set(changes)
          .where(thisImage)
          .returning({ id: productImages.id }),
      );
    }
    return findProduct(this.db, productId);
  }

  /** The first image is the product's main one. */
  async reorder(productId: string, ids: string[]): Promise<Product> {
    await assertProduct(this.db, productId);
    await this.db.transaction((tx) =>
      saveOrder(tx, productImages, eq(productImages.productId, productId), ids),
    );
    return findProduct(this.db, productId);
  }

  async remove(productId: string, imageId: string): Promise<Product> {
    const image = found(
      await this.db
        .delete(productImages)
        .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
        .returning({ storageKey: productImages.storageKey }),
    );
    await this.deleteStored([image.storageKey]);
    return findProduct(this.db, productId);
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
    const count = await this.db.$count(
      optionValues,
      and(
        eq(optionValues.id, optionValueId),
        exists(
          this.db
            .select({ productId: productOptions.productId })
            .from(productOptions)
            .where(
              and(
                eq(productOptions.productId, productId),
                eq(productOptions.optionTypeId, optionValues.optionTypeId),
              ),
            ),
        ),
      ),
    );
    if (!count) throw invalidField('optionValueId', "Choose one of the product's option values");
  }
}
