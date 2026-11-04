/**
 * Site-wide content: brand name and fixed footer links. Shop navigation comes
 * from the catalog's top-level categories (see lib/catalog/nav.ts).
 */
export const siteConfig = {
  name: 'Anwar Shah & Sons',
  description: 'Shop online at Anwar Shah & Sons.',
  home: {
    eyebrow: 'Anwar Shah & Sons',
    headline: 'Clothing made to be worn, and worn again.',
    intro: 'Everyday and occasion wear for the whole family, chosen with care.',
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
