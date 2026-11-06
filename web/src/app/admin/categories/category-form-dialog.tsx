'use client';

import { useActionState, useState } from 'react';
import type { Category } from '@repo/shared';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { descendantIds, flattenCategoryTree } from '@/lib/catalog/category-tree';
import { formKey, initialActionState, type ActionState } from '@/lib/forms/action-state';
import { saveCategory } from './actions';

type CategoryFormDialogProps = {
  categories: Category[];
  /** Edit this category; create a new one when omitted. */
  category?: Category;
};

export function CategoryFormDialog({ categories, category }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveCategory(previous, formData);
      if (result.status === 'success') setOpen(false);
      return result;
    },
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  const excluded = category ? descendantIds(categories, category.id) : new Set<string>();
  const parents = flattenCategoryTree(categories).filter(({ category: c }) => !excluded.has(c.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button variant="ghost" size="sm" aria-label={`Edit ${category.name}`}>
            Edit
          </Button>
        ) : (
          <Button>New category</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form key={formKey(state)} action={formAction} className="grid gap-5" noValidate>
          {category && <input type="hidden" name="id" value={category.id} />}
          <DialogHeader>
            <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
          <FormField
            name="name"
            label="Name"
            defaultValue={values.name ?? category?.name}
            error={errors.name}
          />
          <FormField
            name="slug"
            label="URL slug"
            defaultValue={values.slug ?? category?.slug}
            placeholder="Generated from the name"
            error={errors.slug}
          />
          <div className="grid gap-2">
            <Label htmlFor="parentId">Parent</Label>
            <Select name="parentId" defaultValue={values.parentId ?? category?.parentId ?? 'none'}>
              <SelectTrigger id="parentId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top level)</SelectItem>
                {parents.map(({ category: parent, depth }) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {'— '.repeat(depth)}
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.parentId && <p className="text-sm text-destructive">{errors.parentId}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={values.description ?? category?.description ?? ''}
              aria-invalid={errors.description ? true : undefined}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
