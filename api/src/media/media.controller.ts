import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.js';

const FILE_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp|avif)$/;

/**
 * Serves uploaded media. Keys contain a random UUID and are never reused, so
 * responses are cacheable forever. Only image keys of the expected shape are
 * looked up.
 */
@AllowAnonymous()
@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get('products/:productId/:file')
  async productImage(
    @Param('productId') productId: string,
    @Param('file') file: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    if (!/^[a-z0-9]+$/i.test(productId) || !FILE_PATTERN.test(file)) throw new NotFoundException();

    const stored = await this.storage.get(`products/${productId}/${file}`);
    if (!stored) throw new NotFoundException();

    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(stored.body, {
      type: stored.contentType,
      length: stored.size,
      disposition: 'inline',
    });
  }
}
