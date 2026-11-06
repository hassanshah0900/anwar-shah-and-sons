import { describe, expect, it } from 'vitest';
import { formList, optionalText, submittedValues } from './action-state';

describe('form helpers', () => {
  it('treats blank text as missing', () => {
    const form = new FormData();
    form.set('slug', '   ');
    form.set('name', 'Kurtas');

    expect(optionalText(form, 'slug')).toBeUndefined();
    expect(optionalText(form, 'name')).toBe('Kurtas');
  });

  it('echoes text values but not files or React internals', () => {
    const form = new FormData();
    form.set('name', 'Kurtas');
    form.set('$ACTION_ID_abc', '');
    form.set('image', new Blob(['x']));

    expect(submittedValues(form)).toEqual({ name: 'Kurtas' });
  });

  it('keeps every value of a repeated field', () => {
    const form = new FormData();
    form.append('optionTypeIds', 'size');
    form.append('optionTypeIds', 'colour');

    expect(formList(submittedValues(form), 'optionTypeIds')).toEqual(['size', 'colour']);
  });
});
