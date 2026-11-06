'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ProductDetail } from '@repo/shared';
import { cn } from '@/lib/utils';

/**
 * Main image with thumbnails. Re-mount it (via `key`) when the image set
 * changes, so it starts again from the first image.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: ProductDetail['images'];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  if (!current) {
    return (
      <div className="grid aspect-3/4 place-items-center rounded-md bg-muted text-sm text-muted-foreground">
        No image
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-3/4 overflow-hidden rounded-md bg-muted">
        <Image
          src={`/media/${current.key}`}
          alt={current.alt || name}
          fill
          preload
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2" aria-label="Product images">
          {images.map((image, position) => (
            <li key={image.key}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Show image ${position + 1} of ${images.length}`}
                aria-current={position === index || undefined}
                className={cn(
                  'relative block aspect-3/4 w-full overflow-hidden rounded-sm border bg-muted transition-opacity',
                  position === index ? 'border-foreground' : 'opacity-70 hover:opacity-100',
                )}
              >
                <Image
                  src={`/media/${image.key}`}
                  alt=""
                  fill
                  sizes="10vw"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
