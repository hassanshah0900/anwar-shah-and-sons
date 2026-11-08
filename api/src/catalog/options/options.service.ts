import { BadRequestException, Injectable } from '@nestjs/common';
import {
  slugify,
  type OptionType,
  type OptionTypeInput,
  type OptionValue,
  type OptionValueInput,
} from '@repo/shared';
import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../db/connection.js';
import { InjectDatabase } from '../../db/database.module.js';
import { found, nextPosition, orNotFound, saveOrder, touch } from '../../db/queries.js';
import { optionTypes, optionValues } from '../../db/schema/index.js';

const valueColumns = {
  id: optionValues.id,
  label: optionValues.label,
  slug: optionValues.slug,
  colorHex: optionValues.colorHex,
  position: optionValues.position,
};

/** An option type with its values, in display order. */
const typeShape = {
  columns: { id: true, name: true, slug: true, kind: true, position: true } as const,
  with: {
    values: {
      columns: { id: true, label: true, slug: true, colorHex: true, position: true } as const,
      orderBy: [asc(optionValues.position), asc(optionValues.label)],
    },
  },
};

export type OptionTypeUpdate = Partial<Omit<OptionTypeInput, 'kind'>>;

@Injectable()
export class OptionsService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  listTypes(): Promise<OptionType[]> {
    return this.db.query.optionTypes.findMany({
      ...typeShape,
      orderBy: [asc(optionTypes.position), asc(optionTypes.name)],
    });
  }

  async createType(input: OptionTypeInput): Promise<OptionType> {
    // Without an explicit position, new types go last.
    const position = input.position ?? (await nextPosition(this.db, optionTypes));

    const rows = await this.db
      .insert(optionTypes)
      .values({
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        kind: input.kind,
        position,
      })
      .returning({ id: optionTypes.id });
    return this.type(found(rows).id);
  }

  /** The kind can't change after creation, so existing values stay valid. */
  async updateType(id: string, input: OptionTypeUpdate): Promise<OptionType> {
    found(
      await this.db
        .update(optionTypes)
        .set(touch({ name: input.name, slug: input.slug, position: input.position }))
        .where(eq(optionTypes.id, id))
        .returning({ id: optionTypes.id }),
    );
    return this.type(id);
  }

  async removeType(id: string): Promise<void> {
    found(
      await this.db
        .delete(optionTypes)
        .where(eq(optionTypes.id, id))
        .returning({ id: optionTypes.id }),
    );
  }

  async createValue(typeId: string, input: OptionValueInput): Promise<OptionValue> {
    const kind = await this.kindOf(typeId);
    // Without an explicit position, values keep the order they were added in (XS, S, M…).
    const position =
      input.position ??
      (await nextPosition(this.db, optionValues, eq(optionValues.optionTypeId, typeId)));

    const rows = await this.db
      .insert(optionValues)
      .values({
        optionTypeId: typeId,
        label: input.label,
        slug: input.slug ?? slugify(input.label),
        colorHex: this.colorFor(kind, input.colorHex, true),
        position,
      })
      .returning(valueColumns);
    return found(rows);
  }

  async updateValue(
    typeId: string,
    valueId: string,
    input: Partial<OptionValueInput>,
  ): Promise<OptionValue> {
    const kind = await this.kindOf(typeId);

    const rows = await this.db
      .update(optionValues)
      .set(
        touch({
          label: input.label,
          slug: input.slug,
          colorHex: input.colorHex === undefined ? undefined : this.colorFor(kind, input.colorHex),
          position: input.position,
        }),
      )
      .where(and(eq(optionValues.id, valueId), eq(optionValues.optionTypeId, typeId)))
      .returning(valueColumns);
    return found(rows);
  }

  async reorderValues(typeId: string, ids: string[]): Promise<OptionType> {
    await this.kindOf(typeId);
    await this.db.transaction((tx) =>
      saveOrder(tx, optionValues, eq(optionValues.optionTypeId, typeId), ids),
    );
    return this.type(typeId);
  }

  async removeValue(typeId: string, valueId: string): Promise<void> {
    found(
      await this.db
        .delete(optionValues)
        .where(and(eq(optionValues.id, valueId), eq(optionValues.optionTypeId, typeId)))
        .returning({ id: optionValues.id }),
    );
  }

  private async type(id: string): Promise<OptionType> {
    return orNotFound(
      await this.db.query.optionTypes.findFirst({
        where: eq(optionTypes.id, id),
        ...typeShape,
      }),
    );
  }

  private async kindOf(typeId: string): Promise<'text' | 'color'> {
    const type = orNotFound(
      await this.db.query.optionTypes.findFirst({
        where: eq(optionTypes.id, typeId),
        columns: { kind: true },
      }),
    );
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
