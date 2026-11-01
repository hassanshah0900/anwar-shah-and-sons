import type { ImageContentType } from '@repo/shared';

/**
 * Detects an image type from the file's first bytes. The client-supplied name
 * and MIME type are never trusted: a renamed HTML or SVG file must not be stored
 * and later served as an image.
 */
export function detectImageType(bytes: Buffer): ImageContentType | null {
  const ascii = (start: number, end: number) => bytes.subarray(start, end).toString('latin1');

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return 'image/avif';
  return null;
}
