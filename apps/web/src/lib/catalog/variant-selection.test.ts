import { describe, expect, it } from 'vitest';
import type { ProductDetail } from '@repo/shared';
import {
  choose,
  imagesFor,
  initialSelection,
  priceRange,
  selectedVariant,
  selectionParams,
  valueState,
} from './variant-selection';

// Black: S, M (M sold out). Ivory: M, L (L costs more). No Ivory S, no Black L.
const product: ProductDetail = {
  id: 'p1',
  name: 'Lawn Kurta',
  slug: 'lawn-kurta',
  description: null,
  price: 1000,
  compareAtPrice: null,
  breadcrumbs: [],
  options: [
    {
      name: 'Colour',
      slug: 'colour',
      kind: 'color',
      values: [
        { id: 'black', label: 'Black', slug: 'black', colorHex: '#000000' },
        { id: 'ivory', label: 'Ivory', slug: 'ivory', colorHex: '#ffffff' },
      ],
    },
    {
      name: 'Size',
      slug: 'size',
      kind: 'text',
      values: [
        { id: 's', label: 'S', slug: 's', colorHex: null },
        { id: 'm', label: 'M', slug: 'm', colorHex: null },
        { id: 'l', label: 'L', slug: 'l', colorHex: null },
      ],
    },
  ],
  variants: [
    { id: 'black-s', optionValueIds: ['black', 's'], price: 1000, stockLevel: 'in_stock' },
    { id: 'black-m', optionValueIds: ['black', 'm'], price: 1000, stockLevel: 'out_of_stock' },
    { id: 'ivory-m', optionValueIds: ['ivory', 'm'], price: 1000, stockLevel: 'low_stock' },
    { id: 'ivory-l', optionValueIds: ['ivory', 'l'], price: 1200, stockLevel: 'in_stock' },
  ],
  images: [
    { key: 'shared.jpg', alt: '', optionValueId: null },
    { key: 'black.jpg', alt: '', optionValueId: 'black' },
    { key: 'ivory.jpg', alt: '', optionValueId: 'ivory' },
  ],
};

describe('selectedVariant', () => {
  it('needs a value for every option', () => {
    expect(selectedVariant(product, { colour: 'ivory' })).toBeNull();
    expect(selectedVariant(product, { colour: 'ivory', size: 'l' })?.id).toBe('ivory-l');
  });
});

describe('valueState', () => {
  it('marks sizes by what the chosen colour offers', () => {
    const black = { colour: 'black' };
    expect(valueState(product, black, 'size', 's')).toBe('available');
    expect(valueState(product, black, 'size', 'm')).toBe('sold_out');
    expect(valueState(product, black, 'size', 'l')).toBe('unavailable');
  });

  it('ignores the option being looked at', () => {
    expect(valueState(product, { colour: 'black' }, 'colour', 'ivory')).toBe('available');
  });
});

describe('choose', () => {
  it('drops a choice that no longer combines', () => {
    expect(choose(product, { colour: 'black', size: 's' }, 'colour', 'ivory')).toEqual({
      colour: 'ivory',
    });
  });

  it('keeps choices that still combine', () => {
    expect(choose(product, { colour: 'black', size: 'm' }, 'colour', 'ivory')).toEqual({
      colour: 'ivory',
      size: 'm',
    });
  });
});

describe('priceRange', () => {
  it('narrows as options are chosen', () => {
    expect(priceRange(product, {})).toEqual({ min: 1000, max: 1200 });
    expect(priceRange(product, { colour: 'black' })).toEqual({ min: 1000, max: 1000 });
  });
});

describe('initialSelection', () => {
  it('reads values from the URL by slug', () => {
    expect(initialSelection(product, { colour: 'ivory', size: 'l' })).toEqual({
      colour: 'ivory',
      size: 'l',
    });
  });

  it('defaults to the first colour in stock and leaves size open', () => {
    expect(initialSelection(product, {})).toEqual({ colour: 'black' });
  });

  it('ignores unknown slugs', () => {
    expect(initialSelection(product, { colour: 'pink', size: 'xxl' })).toEqual({
      colour: 'black',
    });
  });
});

describe('selectionParams', () => {
  it('writes slugs in option order', () => {
    expect(selectionParams(product, { size: 'm', colour: 'ivory' }).toString()).toBe(
      'colour=ivory&size=m',
    );
  });
});

describe('imagesFor', () => {
  it('shows the chosen colour first, then shared images', () => {
    expect(imagesFor(product, { colour: 'ivory' }).map((image) => image.key)).toEqual([
      'ivory.jpg',
      'shared.jpg',
    ]);
  });

  it('shows everything before a colour is chosen', () => {
    expect(imagesFor(product, {})).toHaveLength(3);
  });
});
