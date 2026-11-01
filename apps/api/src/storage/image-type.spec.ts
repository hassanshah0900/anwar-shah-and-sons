import { detectImageType } from './image-type.js';

const bytes = (...parts: (string | number[])[]) =>
  Buffer.concat(
    parts.map((part) =>
      typeof part === 'string' ? Buffer.from(part, 'latin1') : Buffer.from(part),
    ),
  );

describe('detectImageType', () => {
  it.each([
    ['image/jpeg', bytes([0xff, 0xd8, 0xff, 0xe0])],
    ['image/png', bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['image/webp', bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 ')],
    ['image/avif', bytes([0, 0, 0, 0x20], 'ftypavif')],
  ])('recognises %s', (type, content) => {
    expect(detectImageType(content)).toBe(type);
  });

  it.each([
    ['SVG', bytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ['HTML renamed to .jpg', bytes('<!doctype html><script>alert(1)</script>')],
    ['GIF', bytes('GIF89a')],
    ['empty', Buffer.alloc(0)],
  ])('rejects %s', (_name, content) => {
    expect(detectImageType(content)).toBeNull();
  });
});
