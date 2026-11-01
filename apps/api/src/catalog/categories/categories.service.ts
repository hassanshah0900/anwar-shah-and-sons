import { BadRequestException, Injectable } from '@nestjs/common';
import { slugify, type Category, type CategoryInput } from '@repo/shared';
import { PrismaService } from '../../prisma/prisma.service.js';

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  parentId: true,
  position: true,
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Category[]> {
    return this.prisma.category.findMany({
      select: categorySelect,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async create(input: CategoryInput): Promise<Category> {
    if (input.parentId) await this.assertExists(input.parentId);

    return this.prisma.category.create({
      select: categorySelect,
      data: {
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        position: input.position ?? 0,
      },
    });
  }

  async update(id: string, input: Partial<CategoryInput>): Promise<Category> {
    if (input.parentId) await this.assertValidParent(id, input.parentId);

    return this.prisma.category.update({
      where: { id },
      select: categorySelect,
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        parentId: input.parentId,
        position: input.position,
      },
    });
  }

  /** Fails with 409 while the category still has sub-categories. */
  async remove(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  private async assertExists(id: string): Promise<void> {
    const found = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new BadRequestException('Parent category does not exist');
  }

  /** A category can't be its own parent or move under one of its descendants. */
  private async assertValidParent(id: string, parentId: string): Promise<void> {
    if (parentId === id) throw new BadRequestException('A category cannot be its own parent');

    let current: string | null = parentId;
    while (current) {
      const node: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      if (!node) throw new BadRequestException('Parent category does not exist');
      if (node.parentId === id) {
        throw new BadRequestException('A category cannot move under its own sub-category');
      }
      current = node.parentId;
    }
  }
}
