import { describe, expect, it } from 'vitest';
import type { Category } from '@repo/shared';
import { ancestorsOf, descendantIds, flattenCategoryTree } from './category-tree';

const category = (id: string, parentId: string | null, position = 0): Category => ({
  id,
  name: id,
  slug: id,
  description: null,
  parentId,
  position,
});

const categories = [
  category('men', null, 1),
  category('shirts', 'men'),
  category('women', null, 0),
  category('kurtas', 'women', 1),
  category('dupattas', 'women', 0),
  category('formal', 'shirts'),
];

describe('flattenCategoryTree', () => {
  it('lists parents before children, siblings by position', () => {
    expect(
      flattenCategoryTree(categories).map(({ category, depth }) => `${depth}:${category.id}`),
    ).toEqual(['0:women', '1:dupattas', '1:kurtas', '0:men', '1:shirts', '2:formal']);
  });
});

describe('descendantIds', () => {
  it('collects a category and everything below it', () => {
    expect([...descendantIds(categories, 'men')].sort()).toEqual(['formal', 'men', 'shirts']);
  });
});

describe('ancestorsOf', () => {
  it('lists ancestors from the top level down', () => {
    expect(ancestorsOf(categories, 'formal').map(({ id }) => id)).toEqual(['men', 'shirts']);
  });

  it('is empty for a top-level or unknown category', () => {
    expect(ancestorsOf(categories, 'women')).toEqual([]);
    expect(ancestorsOf(categories, 'missing')).toEqual([]);
  });
});
