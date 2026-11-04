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
  about: [
    'Anwar Shah & Sons is a family business that has been dressing families for generations.',
    'We choose fabrics that last and cuts that stay comfortable, from everyday wear to the clothes you keep for special days.',
    'Our online store brings the same care to your door, with cash on delivery and easy exchanges.',
  ],
} as const;
