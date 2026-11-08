import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import {
  ADMIN_ROLE,
  optionTypeInputSchema,
  optionValueInputSchema,
  reorderSchema,
  type OptionType,
  type OptionTypeInput,
  type OptionTypeList,
  type OptionValue,
  type OptionValueInput,
  type Reorder,
} from '@repo/shared';
import { Roles } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { OptionsService, type OptionTypeUpdate } from './options.service.js';

const optionTypeUpdateSchema = optionTypeInputSchema.omit({ kind: true }).partial();
const optionValueUpdateSchema = optionValueInputSchema.partial();

@Roles([ADMIN_ROLE])
@Controller('admin/option-types')
export class OptionsController {
  constructor(private readonly options: OptionsService) {}

  @Get()
  async list(): Promise<OptionTypeList> {
    return { optionTypes: await this.options.listTypes() };
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(optionTypeInputSchema)) input: OptionTypeInput,
  ): Promise<OptionType> {
    return this.options.createType(input);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(optionTypeUpdateSchema)) input: OptionTypeUpdate,
  ): Promise<OptionType> {
    return this.options.updateType(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.options.removeType(id);
  }

  @Post(':id/values')
  createValue(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(optionValueInputSchema)) input: OptionValueInput,
  ): Promise<OptionValue> {
    return this.options.createValue(id, input);
  }

  @Put(':id/values/order')
  reorderValues(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reorderSchema)) { ids }: Reorder,
  ): Promise<OptionType> {
    return this.options.reorderValues(id, ids);
  }

  @Patch(':id/values/:valueId')
  updateValue(
    @Param('id') id: string,
    @Param('valueId') valueId: string,
    @Body(new ZodValidationPipe(optionValueUpdateSchema)) input: Partial<OptionValueInput>,
  ): Promise<OptionValue> {
    return this.options.updateValue(id, valueId, input);
  }

  @Delete(':id/values/:valueId')
  @HttpCode(204)
  removeValue(@Param('id') id: string, @Param('valueId') valueId: string): Promise<void> {
    return this.options.removeValue(id, valueId);
  }
}
