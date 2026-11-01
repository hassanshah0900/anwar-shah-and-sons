import type { PrismaService } from '../../src/prisma/prisma.service.js';

/** Clears catalog data in dependency order (products before what they reference). */
export async function resetCatalog(prisma: PrismaService): Promise<void> {
  await prisma.product.deleteMany();
  await prisma.optionType.deleteMany();
  // Children first: a category with sub-categories can't be deleted.
  for (let depth = 0; depth < 10 && (await prisma.category.count()) > 0; depth++) {
    await prisma.category.deleteMany({ where: { children: { none: {} } } });
  }
}
