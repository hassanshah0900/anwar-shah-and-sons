import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ADMIN_ROLE,
  MAX_IMAGE_BYTES,
  productImageUpdateSchema,
  reorderSchema,
  type Product,
  type ProductImageUpdate,
  type Reorder,
} from '@repo/shared';
import { Roles } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { invalidField, ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ImagesService } from './images.service.js';

/** Text fields sent alongside the file in the multipart form. */
const uploadFieldsSchema = z.object({
  alt: z.string().trim().max(200, 'Use at most 200 characters').optional(),
  optionValueId: z
    .string()
    .optional()
    .transform((value) => value || null),
});

@Roles([ADMIN_ROLE])
@Controller('admin/products/:productId/images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  /** multipart/form-data with `file` and optional `alt` and `optionValueId`. */
  @Post()
  @UseInterceptors(
    // Multer rejects larger files with 413 before they're fully buffered.
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }),
  )
  upload(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(uploadFieldsSchema)) fields: z.output<typeof uploadFieldsSchema>,
  ): Promise<Product> {
    if (!file) throw invalidField('file', 'Choose an image to upload');
    return this.images.upload(productId, { buffer: file.buffer, ...fields });
  }

  @Put('order')
  reorder(
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(reorderSchema)) { ids }: Reorder,
  ): Promise<Product> {
    return this.images.reorder(productId, ids);
  }

  @Patch(':imageId')
  update(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body(new ZodValidationPipe(productImageUpdateSchema)) input: ProductImageUpdate,
  ): Promise<Product> {
    return this.images.update(productId, imageId, input);
  }

  @Delete(':imageId')
  remove(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ): Promise<Product> {
    return this.images.remove(productId, imageId);
  }
}
