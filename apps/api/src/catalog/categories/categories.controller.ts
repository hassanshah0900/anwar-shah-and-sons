import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ADMIN_ROLE,
  categoryInputSchema,
  type Category,
  type CategoryInput,
  type CategoryList,
} from '@repo/shared';
import { Roles } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CategoriesService } from './categories.service.js';

const categoryUpdateSchema = categoryInputSchema.partial();

@Roles([ADMIN_ROLE])
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  async list(): Promise<CategoryList> {
    return { categories: await this.categories.list() };
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(categoryInputSchema)) input: CategoryInput,
  ): Promise<Category> {
    return this.categories.create(input);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(categoryUpdateSchema)) input: Partial<CategoryInput>,
  ): Promise<Category> {
    return this.categories.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.categories.remove(id);
  }
}
