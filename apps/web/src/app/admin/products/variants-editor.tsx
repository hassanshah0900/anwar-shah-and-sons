'use client';

import { useActionState } from 'react';
import type { OptionType, Product, StoreConfig, Variant } from '@repo/shared';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { Swatch } from '@/components/admin/swatch';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formKey, formList, initialActionState } from '@/lib/forms/action-state';
import { formatPrice, priceInputValue } from '@/lib/money';
import { addVariant, deleteVariant, generateVariants, saveVariant } from './variant-actions';

type EditorProps = { product: Product; optionTypes: OptionType[]; store: StoreConfig };

export function VariantsEditor({ product, optionTypes, store }: EditorProps) {
  const productOptions = product.options
    .map((option) => optionTypes.find((type) => type.id === option.optionTypeId))
    .filter((type): type is OptionType => Boolean(type));

  // The variant's value for each option, in the product's option order.
  const describe = (variant: Variant) =>
    productOptions.flatMap((type) => {
      const value = type.values.find((candidate) => variant.optionValueIds.includes(candidate.id));
      return value ? [value] : [];
    });

  return (
    <section aria-labelledby="variants-heading" className="mt-16 grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="variants-heading" className="text-3xl">
            Variants
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {productOptions.length
              ? `One per combination of ${productOptions.map((type) => type.name).join(' and ')}. Leave the price blank to use ${formatPrice(product.price, store)}.`
              : 'This product has no options, so a single variant holds its SKU and stock.'}
          </p>
        </div>
        {productOptions.length > 0 && <GenerateButton productId={product.id} />}
      </div>

      {product.variants.length === 0 ? (
        <p className="border border-dashed p-8 text-center text-sm text-muted-foreground">
          No variants yet.
        </p>
      ) : (
        <div className="overflow-x-auto border">
          <Table>
            <TableHeader>
              <TableRow>
                {productOptions.length > 0 && <TableHead>Variant</TableHead>}
                <TableHead>SKU</TableHead>
                <TableHead>Price ({store.currency})</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="w-0">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants.map((variant) => (
                <VariantRow
                  key={variant.id}
                  productId={product.id}
                  variant={variant}
                  label={describe(variant)}
                  hasOptions={productOptions.length > 0}
                  store={store}
                  productPrice={product.price}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(productOptions.length > 0 || product.variants.length === 0) && (
        <AddVariantForm productId={product.id} options={productOptions} store={store} />
      )}
    </section>
  );
}

type VariantRowProps = {
  productId: string;
  variant: Variant;
  label: { label: string; colorHex: string | null }[];
  hasOptions: boolean;
  store: StoreConfig;
  productPrice: number;
};

function VariantRow({
  productId,
  variant,
  label,
  hasOptions,
  store,
  productPrice,
}: VariantRowProps) {
  const [state, formAction, pending] = useActionState(saveVariant, initialActionState);
  const formId = `variant-${variant.id}`;
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const name = label.map((value) => value.label).join(' / ') || variant.sku;
  const message =
    state.status === 'error' ? (state.message ?? Object.values(errors).join(' ')) : state.message;

  return (
    <TableRow>
      {hasOptions && (
        <TableCell>
          <span className="flex items-center gap-2">
            {label.map((value) =>
              value.colorHex ? (
                <Swatch key={value.label} color={value.colorHex} label={value.label} />
              ) : null,
            )}
            {name}
          </span>
        </TableCell>
      )}
      <TableCell>
        <form id={formId} action={formAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={variant.id} />
        </form>
        <Input
          form={formId}
          name="sku"
          aria-label={`SKU for ${name}`}
          defaultValue={values?.sku ?? variant.sku}
          aria-invalid={errors.sku ? true : undefined}
          className="min-w-44 font-mono uppercase"
        />
      </TableCell>
      <TableCell>
        <Input
          form={formId}
          name="price"
          inputMode="decimal"
          aria-label={`Price for ${name}`}
          placeholder={priceInputValue(productPrice, store.currency)}
          defaultValue={values?.price ?? priceInputValue(variant.price, store.currency)}
          aria-invalid={errors.price ? true : undefined}
          className="w-32"
        />
      </TableCell>
      <TableCell>
        <Input
          form={formId}
          name="stock"
          inputMode="numeric"
          aria-label={`Stock for ${name}`}
          defaultValue={values?.stock ?? String(variant.stock)}
          aria-invalid={errors.stock ? true : undefined}
          className="w-24"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {message && (
            <span
              role={state.status === 'error' ? 'alert' : 'status'}
              className={
                state.status === 'error'
                  ? 'text-sm text-destructive'
                  : 'text-sm text-muted-foreground'
              }
            >
              {message}
            </span>
          )}
          <Button
            type="submit"
            form={formId}
            variant="outline"
            size="sm"
            disabled={pending}
            aria-label={`Save ${name}`}
          >
            {pending ? 'Saving…' : 'Save'}
          </Button>
          <ConfirmDeleteDialog
            title={`Delete ${name}?`}
            description="Its SKU and stock are removed."
            action={deleteVariant}
            fields={{ productId, variantId: variant.id }}
            label={`Delete ${name}`}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function GenerateButton({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(generateVariants, initialActionState);

  return (
    <form action={formAction} className="grid justify-items-end gap-2">
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? 'Generating…' : 'Generate all combinations'}
      </Button>
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}

type AddVariantFormProps = { productId: string; options: OptionType[]; store: StoreConfig };

function AddVariantForm({ productId, options, store }: AddVariantFormProps) {
  const [state, formAction, pending] = useActionState(addVariant, initialActionState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const chosen = formList(values, 'optionValueIds');

  return (
    <form
      key={formKey(state)}
      action={formAction}
      className="grid gap-4 border bg-muted/40 p-4"
      noValidate
    >
      <h3 className="text-base">Add a variant</h3>
      <input type="hidden" name="productId" value={productId} />
      <FormError
        message={state.status === 'error' ? (state.message ?? errors.optionValueIds ?? null) : null}
      />
      <div className="flex flex-wrap items-start gap-4">
        {options.map((option) => (
          <div key={option.id} className="grid w-40 gap-2">
            <Label htmlFor={`new-${option.id}`}>{option.name}</Label>
            <Select
              name="optionValueIds"
              defaultValue={option.values.find((value) => chosen.includes(value.id))?.id}
            >
              <SelectTrigger id={`new-${option.id}`} className="w-full">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {option.values.map((value) => (
                  <SelectItem key={value.id} value={value.id}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <div className="w-48">
          <FormField
            id="new-sku"
            name="sku"
            label="SKU"
            defaultValue={values.sku}
            error={errors.sku}
          />
        </div>
        <div className="w-32">
          <FormField
            id="new-price"
            name="price"
            label={`Price (${store.currency})`}
            inputMode="decimal"
            placeholder="Product price"
            defaultValue={values.price}
            error={errors.price}
          />
        </div>
        <div className="w-24">
          <FormField
            id="new-stock"
            name="stock"
            label="Stock"
            inputMode="numeric"
            defaultValue={values.stock ?? '0'}
            error={errors.stock}
          />
        </div>
        <Button type="submit" disabled={pending} className="mt-7">
          {pending ? 'Adding…' : 'Add variant'}
        </Button>
      </div>
    </form>
  );
}
