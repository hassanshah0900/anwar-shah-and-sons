/** Site-wide content: brand name and navigation. Routes are added as their slices land. */
export const siteConfig = {
  name: 'Anwar Shah & Sons',
  description: 'Shop online at Anwar Shah & Sons.',
  mainNav: [
    { title: 'New In', href: '/shop/new-in' },
    { title: 'Women', href: '/shop/women' },
    { title: 'Men', href: '/shop/men' },
    { title: 'Kids', href: '/shop/kids' },
  ],
  footerNav: [
    {
      title: 'Shop',
      links: [
        { title: 'New In', href: '/shop/new-in' },
        { title: 'Women', href: '/shop/women' },
        { title: 'Men', href: '/shop/men' },
        { title: 'Kids', href: '/shop/kids' },
      ],
    },
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
