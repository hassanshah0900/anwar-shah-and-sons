import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  listingHref,
  pageWindow,
  readListingState,
  toListingQuery,
  toggleOption,
  type ListingState,
} from './listing-params';

const empty: ListingState = { options: [], sort: 'newest', page: 1 };

describe('readListingState', () => {
  it('defaults when the URL has no params', () => {
    expect(readListingState({})).toEqual(empty);
  });

  it('reads every param', () => {
    expect(
      readListingState({
        q: ' kurta ',
        option: ['size:m', 'colour:black'],
        min: '1,000',
        max: '5000',
        sort: 'price-asc',
        page: '3',
      }),
    ).toEqual({
      q: 'kurta',
      options: ['colour:black', 'size:m'],
      min: 1000,
      max: 5000,
      sort: 'price-asc',
      page: 3,
    });
  });

  it('ignores invalid values instead of failing', () => {
    expect(
      readListingState({
        q: '  ',
        option: ['size:m', 'BAD', 'size:m'],
        min: 'abc',
        max: '-5',
        sort: 'cheapest',
        page: '0',
      }),
    ).toEqual({ ...empty, options: ['size:m'] });
  });
});

describe('toListingQuery', () => {
  it('converts prices to minor units', () => {
    const query = toListingQuery({ ...empty, min: 49.9, max: 100 }, 'USD', 'women');
    expect(query).toMatchObject({ category: 'women', minPrice: 4990, maxPrice: 10000 });
  });
});

describe('listingHref', () => {
  const state: ListingState = { ...empty, options: ['size:m'], sort: 'price-desc', page: 4 };

  it('keeps the current state and goes back to page 1 on a change', () => {
    expect(listingHref('/shop', state, { options: [] })).toBe('/shop?sort=price-desc');
  });

  it('keeps the page when the page is what changes', () => {
    expect(listingHref('/shop', state, { page: 5 })).toBe(
      '/shop?option=size%3Am&sort=price-desc&page=5',
    );
  });

  it('gives a bare path for the default state', () => {
    expect(listingHref('/shop/women', empty)).toBe('/shop/women');
  });
});

describe('toggleOption', () => {
  it('adds and removes a filter', () => {
    expect(toggleOption(['size:m'], 'colour:red')).toEqual(['colour:red', 'size:m']);
    expect(toggleOption(['colour:red', 'size:m'], 'size:m')).toEqual(['colour:red']);
  });
});

describe('activeFilterCount', () => {
  it('counts each option and the price range once', () => {
    expect(activeFilterCount({ ...empty, options: ['a:b', 'c:d'], min: 1, max: 2 })).toBe(3);
  });
});

describe('pageWindow', () => {
  it('lists every page when there are few', () => {
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
  });

  it('shows gaps around the current page', () => {
    expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
  });

  it('fills a one-page gap with the page itself', () => {
    expect(pageWindow(4, 12)).toEqual([1, 2, 3, 4, 5, null, 12]);
  });
});
