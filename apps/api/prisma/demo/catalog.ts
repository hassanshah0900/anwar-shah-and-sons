import type { Garment, Pattern } from './images.js';

/** The demo store's catalog. Prices are in PKR (no minor unit). */

export const colours = [
  { slug: 'black', label: 'Black', hex: '#1a1a1a' },
  { slug: 'ivory', label: 'Ivory', hex: '#f5f0e6' },
  { slug: 'white', label: 'White', hex: '#f4f4f2' },
  { slug: 'beige', label: 'Beige', hex: '#d9c7a7' },
  { slug: 'grey', label: 'Grey', hex: '#8a8a8a' },
  { slug: 'navy', label: 'Navy', hex: '#1f2a44' },
  { slug: 'sky-blue', label: 'Sky blue', hex: '#a9c3d9' },
  { slug: 'teal', label: 'Teal', hex: '#2f5d62' },
  { slug: 'olive', label: 'Olive', hex: '#5b5e3a' },
  { slug: 'mustard', label: 'Mustard', hex: '#c9a03b' },
  { slug: 'rose', label: 'Rose', hex: '#d8a7a7' },
  { slug: 'maroon', label: 'Maroon', hex: '#6b1f2a' },
] as const;

export const adultSizes = ['S', 'M', 'L', 'XL'];
export const kidsSizes = ['4-5Y', '6-7Y', '8-9Y', '10-11Y'];

export type CategorySpec = {
  slug: string;
  name: string;
  description: string;
  parent?: string;
};

/** Parents before children. Existing categories (matched by slug) are left as they are. */
export const categories: CategorySpec[] = [
  {
    slug: 'women',
    name: 'Women',
    description: 'Kurtas, dupattas and shawls for every day and every occasion.',
  },
  {
    slug: 'kurtas',
    name: 'Kurtas',
    description: 'Lawn, cambric and silk kurtas.',
    parent: 'women',
  },
  {
    slug: 'dupattas',
    name: 'Dupattas',
    description: 'Chiffon and lawn dupattas.',
    parent: 'women',
  },
  {
    slug: 'shawls',
    name: 'Shawls',
    description: 'Warm shawls for cooler evenings.',
    parent: 'women',
  },
  { slug: 'men', name: 'Men', description: 'Kurtas, shirts and waistcoats, cut for comfort.' },
  {
    slug: 'men-kurtas',
    name: 'Kurtas',
    description: 'Cotton, linen and wash & wear kurtas.',
    parent: 'men',
  },
  {
    slug: 'shirts',
    name: 'Shirts',
    description: 'Oxford, linen and flannel shirts.',
    parent: 'men',
  },
  {
    slug: 'waistcoats',
    name: 'Waistcoats',
    description: 'Waistcoats for weddings and Eid.',
    parent: 'men',
  },
  { slug: 'kids', name: 'Kids', description: 'Easy, soft clothes for boys and girls.' },
  { slug: 'boys', name: 'Boys', description: 'Kurtas for boys.', parent: 'kids' },
  { slug: 'girls', name: 'Girls', description: 'Kurtas for girls.', parent: 'kids' },
];

export type ProductSpec = {
  name: string;
  slug: string;
  category: string;
  garment: Garment;
  pattern: Pattern;
  price: number;
  compareAtPrice?: number;
  colours: string[];
  /** Omitted for one-size items such as dupattas. */
  sizes?: string[];
  description: string;
};

export const products: ProductSpec[] = [
  {
    name: 'Embroidered Lawn Kurta',
    slug: 'embroidered-lawn-kurta',
    category: 'kurtas',
    garment: 'kurta',
    pattern: 'embroidery',
    price: 6490,
    compareAtPrice: 7990,
    colours: ['maroon', 'ivory', 'teal'],
    sizes: adultSizes,
    description:
      'Breathable lawn with tonal embroidery across the front.\nStraight cut, three-quarter sleeves.',
  },
  {
    name: 'Printed Cambric Kurta',
    slug: 'printed-cambric-kurta',
    category: 'kurtas',
    garment: 'kurta',
    pattern: 'print',
    price: 3990,
    colours: ['rose', 'sky-blue', 'mustard'],
    sizes: ['S', 'M', 'L'],
    description: 'Soft cambric with an all-over floral print. Easy to wear, easy to wash.',
  },
  {
    name: 'Chikankari Kurta',
    slug: 'chikankari-kurta',
    category: 'kurtas',
    garment: 'kurta',
    pattern: 'embroidery',
    price: 8990,
    colours: ['white', 'beige'],
    sizes: adultSizes,
    description: 'Hand-finished chikankari embroidery on fine cotton.',
  },
  {
    name: 'Silk Festive Kurta',
    slug: 'silk-festive-kurta',
    category: 'kurtas',
    garment: 'kurta',
    pattern: 'plain',
    price: 11990,
    compareAtPrice: 13990,
    colours: ['maroon', 'black', 'teal'],
    sizes: adultSizes,
    description: 'Raw silk with a soft sheen, made for weddings and Eid.',
  },
  {
    name: 'Chiffon Dupatta',
    slug: 'chiffon-dupatta',
    category: 'dupattas',
    garment: 'shawl',
    pattern: 'plain',
    price: 2490,
    colours: ['rose', 'ivory', 'black', 'mustard'],
    description: 'Light chiffon dupatta with a fine finished edge.',
  },
  {
    name: 'Printed Lawn Dupatta',
    slug: 'printed-lawn-dupatta',
    category: 'dupattas',
    garment: 'shawl',
    pattern: 'print',
    price: 1890,
    colours: ['sky-blue', 'rose'],
    description: 'Printed lawn dupatta to pair with plain kurtas.',
  },
  {
    name: 'Pashmina Shawl',
    slug: 'pashmina-shawl',
    category: 'shawls',
    garment: 'shawl',
    pattern: 'check',
    price: 9990,
    colours: ['beige', 'grey', 'maroon'],
    description: 'Soft, warm pashmina blend in a quiet check, with a hand-knotted fringe.',
  },
  {
    name: 'Classic Cotton Kurta',
    slug: 'classic-cotton-kurta',
    category: 'men-kurtas',
    garment: 'kurta',
    pattern: 'plain',
    price: 4490,
    colours: ['white', 'black', 'navy', 'beige'],
    sizes: adultSizes,
    description: 'Our everyday cotton kurta with a band collar and side pockets.',
  },
  {
    name: 'Wash & Wear Kurta',
    slug: 'wash-and-wear-kurta',
    category: 'men-kurtas',
    garment: 'kurta',
    pattern: 'plain',
    price: 3790,
    colours: ['grey', 'navy', 'olive'],
    sizes: adultSizes,
    description: 'Crease-resistant fabric that keeps its shape all day.',
  },
  {
    name: 'Linen Kurta',
    slug: 'linen-kurta',
    category: 'men-kurtas',
    garment: 'kurta',
    pattern: 'plain',
    price: 5490,
    colours: ['beige', 'white', 'olive'],
    sizes: adultSizes,
    description: 'Pure linen for the hottest days. Softens with every wash.',
  },
  {
    name: 'Oxford Shirt',
    slug: 'oxford-shirt',
    category: 'shirts',
    garment: 'shirt',
    pattern: 'plain',
    price: 3490,
    colours: ['white', 'sky-blue', 'navy'],
    sizes: adultSizes,
    description: 'Button-down Oxford cotton, smart enough for work.',
  },
  {
    name: 'Striped Linen Shirt',
    slug: 'striped-linen-shirt',
    category: 'shirts',
    garment: 'shirt',
    pattern: 'stripe',
    price: 3990,
    compareAtPrice: 4590,
    colours: ['sky-blue', 'white', 'beige'],
    sizes: ['M', 'L', 'XL'],
    description: 'Linen-cotton blend with a fine stripe.',
  },
  {
    name: 'Checked Flannel Shirt',
    slug: 'checked-flannel-shirt',
    category: 'shirts',
    garment: 'shirt',
    pattern: 'check',
    price: 3790,
    colours: ['maroon', 'navy', 'olive'],
    sizes: adultSizes,
    description: 'Brushed flannel for winter mornings.',
  },
  {
    name: 'Wool Waistcoat',
    slug: 'wool-waistcoat',
    category: 'waistcoats',
    garment: 'waistcoat',
    pattern: 'plain',
    price: 6990,
    colours: ['black', 'grey', 'navy'],
    sizes: adultSizes,
    description: 'Wool-blend waistcoat to wear over a kurta.',
  },
  {
    name: 'Jamawar Waistcoat',
    slug: 'jamawar-waistcoat',
    category: 'waistcoats',
    garment: 'waistcoat',
    pattern: 'embroidery',
    price: 8490,
    colours: ['maroon', 'black'],
    sizes: ['M', 'L', 'XL'],
    description: 'Woven jamawar with a satin lining, for the big days.',
  },
  {
    name: 'Boys Cotton Kurta',
    slug: 'boys-cotton-kurta',
    category: 'boys',
    garment: 'kids-kurta',
    pattern: 'plain',
    price: 2290,
    colours: ['white', 'sky-blue', 'navy'],
    sizes: kidsSizes,
    description: 'Soft cotton kurta that stands up to play.',
  },
  {
    name: 'Girls Printed Kurta',
    slug: 'girls-printed-kurta',
    category: 'girls',
    garment: 'kids-kurta',
    pattern: 'print',
    price: 2490,
    colours: ['rose', 'mustard', 'sky-blue'],
    sizes: kidsSizes,
    description: 'Cheerful printed lawn for everyday wear.',
  },
  {
    name: 'Girls Embroidered Kurta',
    slug: 'girls-embroidered-kurta',
    category: 'girls',
    garment: 'kids-kurta',
    pattern: 'embroidery',
    price: 2990,
    compareAtPrice: 3490,
    colours: ['ivory', 'rose'],
    sizes: kidsSizes,
    description: 'Light embroidery on soft cotton, made for Eid.',
  },
];

export const customers = [
  { name: 'Ayesha Khan', city: 'Lahore', line1: '12 Mall Road' },
  { name: 'Bilal Ahmed', city: 'Karachi', line1: '45 Clifton Block 5' },
  { name: 'Fatima Malik', city: 'Islamabad', line1: 'House 7, Street 12, F-7/2' },
  { name: 'Hamza Siddiqui', city: 'Rawalpindi', line1: '22 Saddar Road' },
  { name: 'Zainab Raza', city: 'Faisalabad', line1: '9 Susan Road, Madina Town' },
  { name: 'Usman Tariq', city: 'Multan', line1: '31 Bosan Road' },
  { name: 'Mariam Iqbal', city: 'Lahore', line1: '88 Gulberg III' },
  { name: 'Omar Farooq', city: 'Peshawar', line1: '14 University Road' },
];

/** Demo customers' emails end with this, which also marks their orders. */
export const DEMO_EMAIL_DOMAIN = 'demo.example.com';
export const DEMO_PASSWORD = 'demo-password';
