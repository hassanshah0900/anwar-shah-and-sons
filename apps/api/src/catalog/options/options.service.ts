import { BadRequestException, Injectable } from '@nestjs/common';
import {
  slugify,
  type OptionType,
  type OptionTypeInput,
  type OptionValue,
  type OptionValueInput,
} from '@repo/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const valueSelect = {
  id: true,
  label: true,
  slug: true,
  colorHex: true,
  position: true,
} satisfies Prisma.OptionValueSelect;

const typeSelect = {
  id: true,
  name: true,
  slug: true,
  kind: true,
  position: true,
  values: { select: valueSelect, orderBy: [{ position: 'asc' }, { label: 'asc' }] },
} satisfies Prisma.OptionTypeSelect;

export type OptionTypeUpdate = Partial<Omit<OptionTypeInput, 'kind'>>;

@Injectable()
export class OptionsService {
  constructor(private readonly prisma: PrismaService) {}

  listTypes(): Promise<OptionType[]> {
    return this.prisma.optionType.findMany({
      select: typeSelect,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  createType(input: OptionTypeInput): Promise<OptionType> {
    return this.prisma.optionType.create({
      select: typeSelect,
      data: {
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        kind: input.kind,
        position: input.position ?? 0,
      },
    });
  }

  /** The kind can't change after creation, so existing values stay valid. */
  updateType(id: string, input: OptionTypeUpdate): Promise<OptionType> {
    return this.prisma.optionType.update({
      where: { id },
      select: typeSelect,
      data: { name: input.name, slug: input.slug, position: input.position },
    });
  }

  async removeType(id: string): Promise<void> {
    await this.prisma.optionType.delete({ where: { id } });
  }

  async createValue(typeId: string, input: OptionValueInput): Promise<OptionValue> {
    const kind = await this.kindOf(typeId);

    return this.prisma.optionValue.create({
      select: valueSelect,
      data: {
        optionTypeId: typeId,
        label: input.label,
        slug: input.slug ?? slugify(input.label),
        colorHex: this.colorFor(kind, input.colorHex, true),
        position: input.position ?? 0,
      },
    });
  }

  async updateValue(
    typeId: string,
    valueId: string,
    input: Partial<OptionValueInput>,
  ): Promise<OptionValue> {
    const kind = await this.kindOf(typeId);

    return this.prisma.optionValue.update({
      where: { id: valueId, optionTypeId: typeId },
      select: valueSelect,
      data: {
        label: input.label,
        slug: input.slug,
        colorHex: input.colorHex === undefined ? undefined : this.colorFor(kind, input.colorHex),
        position: input.position,
      },
    });
  }

  async removeValue(typeId: string, valueId: string): Promise<void> {
    await this.prisma.optionValue.delete({ where: { id: valueId, optionTypeId: typeId } });
  }

  private async kindOf(typeId: string): Promise<'text' | 'color'> {
    const type = await this.prisma.optionType.findUniqueOrThrow({
      where: { id: typeId },
      select: { kind: true },
    });
    return type.kind;
  }

  /** Colour values need a swatch; text values never store one. */
  private colorFor(
    kind: 'text' | 'color',
    colorHex: string | null | undefined,
    required = false,
  ): string | null {
    if (kind === 'text') return null;
    if (!colorHex && (required || colorHex === null)) {
      throw new BadRequestException('Colour values need a swatch colour');
    }
    return colorHex ?? null;
  }
}
