'use client';

import type { Category } from '@repo/shared';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { SortableList } from '@/components/admin/sortable-list';
import { childrenByParent } from '@/lib/catalog/category-tree';
import { deleteCategory, reorderCategories } from './actions';
import { CategoryFormDialog } from './category-form-dialog';

/**
 * Categories as nested lists. Each level is ordered on its own, and a category is
 * dragged with its sub-categories; moving it to another parent is done in Edit.
 */
export function CategoryTree({ categories }: { categories: Category[] }) {
  return (
    <CategoryLevel
      parentId={null}
      depth={0}
      categories={categories}
      byParent={childrenByParent(categories)}
    />
  );
}

type LevelProps = {
  parentId: string | null;
  depth: number;
  categories: Category[];
  byParent: Map<string | null, Category[]>;
};

function CategoryLevel({ parentId, depth, categories, byParent }: LevelProps) {
  return (
    <SortableList
      items={byParent.get(parentId) ?? []}
      label={(category) => category.name}
      onReorder={(ids) => reorderCategories(parentId, ids)}
      className={depth === 0 ? 'divide-y border' : 'divide-y border-t'}
    >
      {(category, handle) => (
        <>
          <div
            className="flex items-center gap-3 py-2 pr-2"
            style={{ paddingLeft: `${0.5 + depth * 1.5}rem` }}
          >
            {handle}
            <span className="text-sm font-medium">{category.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{category.slug}</span>
            <div className="ml-auto flex gap-1">
              <CategoryFormDialog categories={categories} category={category} />
              <ConfirmDeleteDialog
                title={`Delete ${category.name}?`}
                description="This can't be undone. Categories with sub-categories can't be deleted."
                action={deleteCategory}
                fields={{ id: category.id }}
                label={`Delete ${category.name}`}
              />
            </div>
          </div>
          {byParent.has(category.id) && (
            <CategoryLevel
              parentId={category.id}
              depth={depth + 1}
              categories={categories}
              byParent={byParent}
            />
          )}
        </>
      )}
    </SortableList>
  );
}
