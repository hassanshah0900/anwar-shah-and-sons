'use client';

import { useActionState } from 'react';
import {
  productStatuses,
  type Category,
  type OptionType,
  type Product,
  type StoreConfig,
} from '@repo/shared';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { flattenCategoryTree } from '@/lib/catalog/category-tree';
import { formList, initialActionState, type ActionState } from '@/lib/forms/action-state';
import { priceInputValue } from '@/lib/money';

type ProductFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  optionTypes: OptionType[];
  store: StoreConfig;
  /** Edit this product; create a new one when omitted. */
  product?: Product;
};

const statusHelp = {
  draft: 'Hidden from the store while you prepare it.',
  active: 'Visible and for sale.',
  archived: 'Retired: hidden from the store but kept for records.',
};

export function ProductForm({ action, categories, optionTypes, store, product }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const hasVariants = (product?.variants.length ?? 0) > 0;
  const selectedOptions = new Set(
    values
      ? formList(values, 'optionTypeIds')
      : (product?.options.map((option) => option.optionTypeId) ?? []),
  );

  return (
    <form action={formAction} className="grid max-w-3xl gap-8" noValidate>
      {product && <input type="hidden" name="id" value={product.id} />}
      {state.status === 'success' && state.message && (
        <p role="status" className="border px-3 py-2 text-sm">
          {state.message}
        </p>
      )}
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />

      <section className="grid gap-5">
        <h2 className="font-sans text-lg font-medium">Details</h2>
        <FormField
          name="name"
          label="Name"
          defaultValue={values?.name ?? product?.name}
          error={errors.name}
        />
        <FormField
          name="slug"
          label="URL slug"
          placeholder="Generated from the name"
          defaultValue={values?.slug ?? product?.slug}
          error={errors.slug}
        />
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={values?.description ?? product?.description ?? ''}
            aria-invalid={errors.description ? true : undefined}
          />
          {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="categoryId">Category</Label>
          <Select name="categoryId" defaultValue={values?.categoryId ?? product?.categoryId}>
            <SelectTrigger
              id="categoryId"
              className="w-full"
              aria-invalid={errors.categoryId ? true : undefined}
            >
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {flattenCategoryTree(categories).map(({ category, depth }) => (
                <SelectItem key={category.id} value={category.id}>
                  {'— '.repeat(depth)}
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId}</p>}
        </div>
      </section>

      <section className="grid gap-5">
        <h2 className="font-sans text-lg font-medium">Pricing ({store.currency})</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            name="price"
            label="Price"
            inputMode="decimal"
            defaultValue={values?.price ?? priceInputValue(product?.price, store.currency)}
            error={errors.price}
          />
          <FormField
            name="compareAtPrice"
            label="Compare-at price (optional)"
            inputMode="decimal"
            placeholder="Original price, shown struck through"
            defaultValue={
              values?.compareAtPrice ?? priceInputValue(product?.compareAtPrice, store.currency)
            }
            error={errors.compareAtPrice}
          />
        </div>
      </section>

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-sans text-lg font-medium">Status</legend>
        <RadioGroup name="status" defaultValue={values?.status ?? product?.status ?? 'draft'}>
          {productStatuses.map((status) => {
            const locked = status === 'active' && !hasVariants;
            return (
              <div key={status} className="flex items-start gap-2">
                <RadioGroupItem
                  id={`status-${status}`}
                  value={status}
                  disabled={locked}
                  className="mt-0.5"
                />
                <Label htmlFor={`status-${status}`} className="grid gap-0.5 font-normal">
                  <span className="font-medium capitalize">{status}</span>
                  <span className="text-muted-foreground">
                    {locked ? 'Add a variant before publishing.' : statusHelp[status]}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-sans text-lg font-medium">Options</legend>
        {hasVariants && (
          <>
            <input type="hidden" name="optionsLocked" value="1" />
            <p className="text-sm text-muted-foreground">
              Options are fixed while the product has variants.
            </p>
          </>
        )}
        {optionTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No options yet. Create Size or Colour under Options first.
          </p>
        ) : (
          optionTypes.map((optionType) => (
            <div key={optionType.id} className="flex items-center gap-2">
              <Checkbox
                id={`option-${optionType.id}`}
                name="optionTypeIds"
                value={optionType.id}
                defaultChecked={selectedOptions.has(optionType.id)}
                disabled={hasVariants}
              />
              <Label htmlFor={`option-${optionType.id}`} className="font-normal">
                {optionType.name}
                <span className="text-muted-foreground">
                  {' '}
                  ({optionType.values.map((value) => value.label).join(', ') || 'no values'})
                </span>
              </Label>
            </div>
          ))
        )}
        {errors.optionTypeIds && <p className="text-sm text-destructive">{errors.optionTypeIds}</p>}
      </fieldset>

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
