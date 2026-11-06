/**
 * Site-wide content: brand name and fixed footer links. Shop navigation comes
 * from the catalog's top-level categories (see lib/catalog/nav.ts).
 */
export const siteConfig = {
  name: 'Anwar Shah & Sons',
  description: 'Shop online at Anwar Shah & Sons.',
  /** A line above the header on every store page; set to null to hide it. */
  announcement: 'Cash on delivery across Pakistan · Easy exchanges' as string | null,
  /**
   * Home page copy and photos. Photos live in public/images (see its README for
   * credits); swap in the store's own by replacing the files or the paths.
   */
  home: {
    eyebrow: 'Anwar Shah & Sons',
    headline: 'Clothing made to be worn, and worn again.',
    intro: 'Everyday and occasion wear for the whole family, chosen with care.',
    heroImage: {
      src: '/images/hero.webp',
      alt: 'A woman in a pale blue embroidered lawn suit and dupatta',
    },
    /** Two large photo links under the new arrivals. */
    features: [
      {
        eyebrow: 'Festive edit',
        title: 'Dressed for the days that matter',
        href: '/shop/women',
        cta: 'Shop women',
        image: {
          src: '/images/festive.webp',
          alt: 'A woman in an embroidered festive outfit holding a sheer dupatta',
        },
      },
      {
        eyebrow: 'Menswear',
        title: 'Kurtas cut for comfort',
        href: '/shop/men',
        cta: 'Shop men',
        image: { src: '/images/menswear.webp', alt: 'A man in a navy kurta seated outdoors' },
      },
    ],
    story: {
      eyebrow: 'Our story',
      title: 'A family business, dressing families for generations',
      text: 'Every piece is chosen in person, for fabric that lasts and a cut that stays comfortable.',
      href: '/about',
      cta: 'About us',
      image: { src: '/images/atelier.webp', alt: 'Rolls of fabric and garments in a workshop' },
    },
  },
  footerNav: [
    {
      title: 'Help',
      links: [
        { title: 'Contact us', href: '/contact' },
        { title: 'Shipping', href: '/shipping' },
        { title: 'Returns & exchanges', href: '/returns' },
      ],
    },
    {
      title: 'Company',
      links: [{ title: 'About us', href: '/about' }],
    },
  ],
} as const;
