import sharp from 'sharp';

/**
 * Generated product photos for the demo catalog: a garment silhouette in the
 * product's colour on a soft studio backdrop, with a light fabric pattern.
 * 900×1200 (3:4, the shop's card ratio), WebP.
 */

export type Garment = 'kurta' | 'shirt' | 'shawl' | 'waistcoat' | 'kids-kurta';
export type Pattern = 'plain' | 'print' | 'embroidery' | 'stripe' | 'check';

const WIDTH = 900;
const HEIGHT = 1200;

/** Silhouettes drawn on the 900×1200 canvas. */
const shapes: Record<Garment, string> = {
  kurta:
    'M330 170 L395 145 Q450 190 505 145 L570 170 L720 270 L780 520 L705 545 L650 360 L655 1060 L245 1060 L250 360 L195 545 L120 520 L180 270 Z',
  'kids-kurta':
    'M360 260 L410 240 Q450 275 490 240 L540 260 L650 335 L695 520 L635 540 L595 405 L600 900 L300 900 L305 405 L265 540 L205 520 L250 335 Z',
  shirt:
    'M320 190 L400 150 L450 215 L500 150 L580 190 L730 290 L790 560 L715 585 L655 390 L660 940 L240 940 L245 390 L185 585 L110 560 L170 290 Z',
  waistcoat:
    'M330 190 L405 165 L450 320 L495 165 L570 190 L620 300 L640 900 L460 940 L450 930 L440 940 L260 900 L280 300 Z',
  shawl: 'M220 330 L680 330 L700 900 L200 900 Z',
};

/** Detail lines (plackets, collars, hems) drawn over the fill. */
const details: Partial<Record<Garment, string>> = {
  kurta: 'M450 190 L450 420 M250 1020 L655 1020',
  'kids-kurta': 'M450 275 L450 430 M300 870 L600 870',
  shirt: 'M450 215 L450 940 M400 150 L450 215 L500 150',
  waistcoat: 'M450 320 L450 930 M420 420 h10 M420 520 h10 M420 620 h10 M420 720 h10',
  shawl:
    'M210 610 L690 610 M215 900 v40 M245 900 v40 M275 900 v40 M305 900 v40 M335 900 v40 M365 900 v40 M395 900 v40 M425 900 v40 M455 900 v40 M485 900 v40 M515 900 v40 M545 900 v40 M575 900 v40 M605 900 v40 M635 900 v40 M665 900 v40 M695 900 v40',
};

function patternDefs(pattern: Pattern, ink: string): string {
  switch (pattern) {
    case 'print':
      return `<pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="5" fill="${ink}" opacity=".35"/><circle cx="45" cy="45" r="3" fill="${ink}" opacity=".3"/><path d="M40 10 q5 8 10 0" stroke="${ink}" stroke-width="2" fill="none" opacity=".3"/></pattern>`;
    case 'embroidery':
      return `<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 6 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill="${ink}" opacity=".28"/></pattern>`;
    case 'stripe':
      return `<pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="6" height="28" fill="${ink}" opacity=".18"/></pattern>`;
    case 'check':
      return `<pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="8" fill="${ink}" opacity=".16"/><rect width="8" height="48" fill="${ink}" opacity=".16"/></pattern>`;
    default:
      return '';
  }
}

/** A readable contrast ink for patterns and details on the garment colour. */
function inkFor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return 0.299 * r! + 0.587 * g! + 0.114 * b! > 150 ? '#1a1a1a' : '#ffffff';
}

export async function garmentImage(
  garment: Garment,
  colorHex: string,
  pattern: Pattern = 'plain',
): Promise<Buffer> {
  const ink = inkFor(colorHex);
  const shape = shapes[garment];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f1ee"/><stop offset="1" stop-color="#e6e3de"/></linearGradient>
    <radialGradient id="light" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
    ${patternDefs(pattern, ink)}
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <ellipse cx="450" cy="1095" rx="300" ry="26" fill="#000" opacity=".08"/>
  <path d="${shape}" fill="${colorHex}"/>
  ${pattern === 'plain' ? '' : `<path d="${shape}" fill="url(#p)"/>`}
  <path d="${shape}" fill="url(#light)"/>
  <path d="${shape}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="3" stroke-linejoin="round"/>
  ${details[garment] ? `<path d="${details[garment]}" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>` : ''}
</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
}
