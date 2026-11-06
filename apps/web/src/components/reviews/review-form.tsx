'use client';

import { useActionState, useState } from 'react';
import { StarIcon } from 'lucide-react';
import { submitReview } from '@/app/(store)/products/[slug]/actions';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formKey, initialActionState } from '@/lib/forms/action-state';
import { cn } from '@/lib/utils';

const ratingLabels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function ReviewForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(submitReview, initialActionState);
  const [rating, setRating] = useState(state.values?.rating ?? '');
  const errors = state.fieldErrors ?? {};

  if (state.status === 'success') {
    return (
      <p role="status" className="text-sm">
        {state.message}
      </p>
    );
  }

  return (
    <form key={formKey(state)} action={formAction} className="grid max-w-xl gap-5" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />

      <div className="grid gap-2">
        <Label id="rating-label">Your rating</Label>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={rating}
            onValueChange={(value) => value && setRating(value)}
            aria-labelledby="rating-label"
            aria-invalid={errors.rating ? true : undefined}
            aria-describedby={errors.rating ? 'rating-error' : undefined}
            spacing={0}
          >
            {ratingLabels.map((label, index) => {
              const value = String(index + 1);
              return (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={`${value} star${index ? 's' : ''}, ${label.toLowerCase()}`}
                  className="size-9 px-0 hover:bg-transparent data-[state=on]:bg-transparent"
                >
                  <StarIcon
                    aria-hidden
                    className={cn(
                      'size-6',
                      Number(rating) > index
                        ? 'fill-foreground text-foreground'
                        : 'text-muted-foreground',
                    )}
                  />
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          {rating && (
            <span className="text-sm text-muted-foreground">
              {ratingLabels[Number(rating) - 1]}
            </span>
          )}
        </div>
        {errors.rating && (
          <p id="rating-error" className="text-sm text-destructive">
            {errors.rating}
          </p>
        )}
      </div>

      <FormField
        name="title"
        label="Title (optional)"
        maxLength={80}
        defaultValue={state.values?.title}
        error={errors.title}
      />

      <div className="grid gap-2">
        <Label htmlFor="review-body">Your review</Label>
        <Textarea
          id="review-body"
          name="body"
          rows={5}
          maxLength={2000}
          placeholder="How is the fabric, fit and colour?"
          defaultValue={state.values?.body}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? 'review-body-error' : undefined}
        />
        {errors.body && (
          <p id="review-body-error" className="text-sm text-destructive">
            {errors.body}
          </p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Posting…' : 'Post review'}
        </Button>
      </div>
    </form>
  );
}
