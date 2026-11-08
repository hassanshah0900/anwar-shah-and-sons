import { BadRequestException, Injectable } from '@nestjs/common';
import { slugify, type Category, type CategoryInput, type CategoryReorder } from '@repo/shared';
import { asc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../db/connection.js';
import { InjectDatabase } from '../../db/database.module.js';
import { found, nextPosition, saveOrder, touch } from '../../db/queries.js';
import { categories } from '../../db/schema/index.js';

const categoryColumns = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  description: categories.description,
  parentId: categories.parentId,
  position: categories.position,
};

@Injectable()
export class CategoriesService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  list(): Promise<Category[]> {
    return this.db
      .select(categoryColumns)
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.name));
  }

  async create(input: CategoryInput): Promise<Category> {
    const parentId = input.parentId ?? null;
    if (parentId) await this.assertExists(parentId);
    // Without an explicit position, new categories go after their siblings.
    const position =
      input.position ??
      (await nextPosition(
        this.db,
        categories,
        parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId),
      ));

    const rows = await this.db
      .insert(categories)
      .values({
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        description: input.description ?? null,
        parentId,
        position,
      })
      .returning(categoryColumns);
    return found(rows);
  }

  async update(id: string, input: Partial<CategoryInput>): Promise<Category> {
    if (input.parentId) await this.assertValidParent(id, input.parentId);

    const rows = await this.db
      .update(categories)
      .set(
        touch({
          name: input.name,
          slug: input.slug,
          description: input.description,
          parentId: input.parentId,
          position: input.position,
        }),
      )
      .where(eq(categories.id, id))
      .returning(categoryColumns);
    return found(rows);
  }

  /** Orders the sub-categories of one parent, or the top level when it's null. */
  async reorder({ parentId, ids }: CategoryReorder): Promise<Category[]> {
    if (parentId) await this.assertExists(parentId);
    await this.db.transaction((tx) =>
      saveOrder(
        tx,
        categories,
        parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId),
        ids,
      ),
    );
    return this.list();
  }

  /** Fails with 409 while the category still has sub-categories or products. */
  async remove(id: string): Promise<void> {
    found(
      await this.db
        .delete(categories)
        .where(eq(categories.id, id))
        .returning({ id: categories.id }),
    );
  }

  private async assertExists(id: string): Promise<void> {
    const node = await this.db.query.categories.findFirst({
      where: eq(categories.id, id),
      columns: { id: true },
    });
    if (!node) throw new BadRequestException('Parent category does not exist');
  }

  /** A category can't be its own parent or move under one of its descendants. */
  private async assertValidParent(id: string, parentId: string): Promise<void> {
    if (parentId === id) throw new BadRequestException('A category cannot be its own parent');

    let current: string | null = parentId;
    while (current) {
      const node: { parentId: string | null } | undefined =
        await this.db.query.categories.findFirst({
          where: eq(categories.id, current),
          columns: { parentId: true },
        });
      if (!node) throw new BadRequestException('Parent category does not exist');
      if (node.parentId === id) {
        throw new BadRequestException('A category cannot move under its own sub-category');
      }
      current = node.parentId;
    }
  }
}
