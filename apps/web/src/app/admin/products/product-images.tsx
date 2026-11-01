'use client';

import Image from 'next/image';
import { useActionState, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import {
  imageContentTypes,
  MAX_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  type OptionType,
  type OptionValue,
  type Product,
  type ProductImage,
} from '@repo/shared';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formKey, initialActionState } from '@/lib/forms/action-state';
import { deleteImage, moveImage, updateImage, uploadImage } from './image-actions';

const ALL = 'all';

type ProductImagesProps = { product: Product; optionTypes: OptionType[] };

export function ProductImages({ product, optionTypes }: ProductImagesProps) {
  // Values an image can be shown for: those of the product's own options.
  const values = product.options.flatMap(
    (option) => optionTypes.find((type) => type.id === option.optionTypeId)?.values ?? [],
  );
  const images = [...product.images].sort((a, b) => a.position - b.position);

  return (
    <section aria-labelledby="images-heading" className="mt-16 grid gap-6">
      <div>
        <h2 id="images-heading" className="text-3xl">
          Images
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The first image is the main one. Link an image to a colour to show it when that colour is
          chosen.
        </p>
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <ImageCard
              key={image.id}
              productId={product.id}
              image={image}
              index={index}
              previous={images[index - 1]}
              next={images[index + 1]}
              values={values}
            />
          ))}
        </ul>
      )}

      {images.length < MAX_PRODUCT_IMAGES ? (
        <UploadForm productId={product.id} values={values} />
      ) : (
        <p className="text-sm text-muted-foreground">
          This product has the maximum of {MAX_PRODUCT_IMAGES} images.
        </p>
      )}
    </section>
  );
}

type ImageCardProps = {
  productId: string;
  image: ProductImage;
  index: number;
  previous?: ProductImage;
  next?: ProductImage;
  values: OptionValue[];
};

function ImageCard({ productId, image, index, previous, next, values }: ImageCardProps) {
  const [state, formAction, pending] = useActionState(updateImage, initialActionState);
  const name = image.alt || `Image ${index + 1}`;

  return (
    <li className="grid content-start gap-3 border p-3">
      <div className="relative aspect-3/4 overflow-hidden bg-muted">
        <Image
          src={`/media/${image.key}`}
          alt={image.alt}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
          className="object-cover"
        />
        {index === 0 && <Badge className="absolute top-2 left-2">Main</Badge>}
      </div>

      <form key={formKey(state)} action={formAction} className="grid gap-2">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="imageId" value={image.id} />
        <FormField
          id={`alt-${image.id}`}
          name="alt"
          label="Alt text"
          placeholder="Describe the photo"
          defaultValue={state.values?.alt ?? image.alt}
          error={state.fieldErrors?.alt}
        />
        {values.length > 0 && (
          <ShowsForSelect
            id={`shows-${image.id}`}
            values={values}
            defaultValue={state.values?.optionValueId ?? image.optionValueId}
          />
        )}
        {state.status === 'error' && state.message && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? 'Saving…' : state.status === 'success' ? 'Saved' : 'Save'}
        </Button>
      </form>

      <div className="flex items-center gap-1">
        <MoveButton
          productId={productId}
          image={image}
          neighbour={previous}
          label={`Move ${name} earlier`}
        >
          <ArrowLeftIcon />
        </MoveButton>
        <MoveButton
          productId={productId}
          image={image}
          neighbour={next}
          label={`Move ${name} later`}
        >
          <ArrowRightIcon />
        </MoveButton>
        <div className="ml-auto">
          <ConfirmDeleteDialog
            title="Delete this image?"
            description="The file is removed from storage. This can't be undone."
            action={deleteImage}
            fields={{ productId, imageId: image.id }}
            label={`Delete ${name}`}
          />
        </div>
      </div>
    </li>
  );
}

type MoveButtonProps = {
  productId: string;
  image: ProductImage;
  neighbour?: ProductImage;
  label: string;
  children: React.ReactNode;
};

function MoveButton({ productId, image, neighbour, label, children }: MoveButtonProps) {
  const [, formAction, pending] = useActionState(moveImage, initialActionState);
  if (!neighbour) {
    return (
      <Button variant="ghost" size="icon-sm" disabled aria-label={label}>
        {children}
      </Button>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="imageId" value={image.id} />
      <input type="hidden" name="position" value={image.position} />
      <input type="hidden" name="neighbourId" value={neighbour.id} />
      <input type="hidden" name="neighbourPosition" value={neighbour.position} />
      <Button type="submit" variant="ghost" size="icon-sm" disabled={pending} aria-label={label}>
        {children}
      </Button>
    </form>
  );
}

function ShowsForSelect({
  id,
  values,
  defaultValue,
}: {
  id: string;
  values: OptionValue[];
  defaultValue?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Shows for</Label>
      {/* "all" is sent for every option value; the action treats it as none. */}
      <Select name="optionValueId" defaultValue={defaultValue || ALL}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All options</SelectItem>
          {values.map((value) => (
            <SelectItem key={value.id} value={value.id}>
              {value.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function UploadForm({ productId, values }: { productId: string; values: OptionValue[] }) {
  const [state, formAction, pending] = useActionState(uploadImage, initialActionState);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileError = clientError ?? state.fieldErrors?.file;

  // Check type and size before uploading several megabytes for nothing.
  function checkFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return setClientError(null);
    if (!(imageContentTypes as readonly string[]).includes(file.type)) {
      return setClientError('Upload a JPEG, PNG, WebP or AVIF image');
    }
    if (file.size > MAX_IMAGE_BYTES) return setClientError('Use an image of at most 5 MB');
    setClientError(null);
  }

  return (
    <form
      key={formKey(state)}
      action={formAction}
      onSubmit={(event) => clientError && event.preventDefault()}
      className="grid gap-4 border bg-muted/40 p-4"
      noValidate
    >
      <h3 className="text-base">Upload an image</h3>
      <input type="hidden" name="productId" value={productId} />
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
      {state.status === 'success' && state.message && (
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="image-file">Image (JPEG, PNG, WebP or AVIF, up to 5 MB)</Label>
          <input
            id="image-file"
            name="file"
            type="file"
            accept={imageContentTypes.join(',')}
            onChange={checkFile}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={fileError ? 'image-file-error' : undefined}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          {fileError && (
            <p id="image-file-error" className="text-sm text-destructive">
              {fileError}
            </p>
          )}
        </div>
        <FormField
          id="image-alt"
          name="alt"
          label="Alt text"
          placeholder="e.g. Front view, black"
          defaultValue={state.values?.alt}
          error={state.fieldErrors?.alt}
        />
        {values.length > 0 && <ShowsForSelect id="image-shows-for" values={values} />}
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
    </form>
  );
}
