import type { Category } from '@repo/shared';

export type CategoryNode = { category: Category; depth: number };

/**
 * Orders categories depth-first (parents before their children, siblings by
 * position then name) and records each one's depth, for indented lists and
 * parent pickers.
 */
export function flattenCategoryTree(categories: Category[]): CategoryNode[] {
  const byParent = new Map<string | null, Category[]>();
  for (const category of categories) {
    const siblings = byParent.get(category.parentId) ?? [];
    siblings.push(category);
    byParent.set(category.parentId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }

  const result: CategoryNode[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const category of byParent.get(parentId) ?? []) {
      result.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/** Ids of a category and all of its descendants: invalid choices for its parent. */
export function descendantIds(categories: Category[], id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        grew = true;
      }
    }
  }
  return ids;
}
