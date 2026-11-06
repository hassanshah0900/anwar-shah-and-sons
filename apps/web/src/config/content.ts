/**
 * Store details and policy wording for the Help and Company pages. Edit these
 * to match the business; prices for shipping come from the API's store config.
 *
 * The contact details below are placeholders until the store provides its own.
 */
export const contentConfig = {
  contact: {
    email: 'hello@example.com',
    phone: '+92 300 0000000',
    address: ['Anwar Shah & Sons', 'Main Bazaar', 'Lahore, Pakistan'],
    hours: 'Monday to Saturday, 10am to 7pm',
  },
  shipping: {
    /** Shown as is, e.g. "3 to 5 working days". */
    deliveryTime: '3 to 5 working days',
    areas: 'We deliver across Pakistan.',
  },
  returns: {
    /** Days after delivery during which items can be returned or exchanged. */
    windowDays: 7,
  },
  /**
   * Garment measurements in inches, shown on product pages for the sizes the
   * product comes in. Sizes match option value labels.
   */
  sizeGuide: [
    { size: 'S', chest: 38, length: 40 },
    { size: 'M', chest: 40, length: 41 },
    { size: 'L', chest: 43, length: 42 },
    { size: 'XL', chest: 46, length: 43 },
    { size: '4-5Y', chest: 26, length: 24 },
    { size: '6-7Y', chest: 28, length: 27 },
    { size: '8-9Y', chest: 30, length: 30 },
    { size: '10-11Y', chest: 32, length: 33 },
  ],
  about: [
    'Anwar Shah & Sons is a family business that has been dressing families for generations.',
    'We choose fabrics that last and cuts that stay comfortable, from everyday wear to the clothes you keep for special days.',
    'Our online store brings the same care to your door, with cash on delivery and easy exchanges.',
  ],
} as const;
