/**
 * Made-up reviews for the demo shop, by product category. The demo seed gives
 * each product a few, from the demo customers. Demo data only: the seed refuses
 * to run in production.
 */

export type DemoReview = { rating: number; title?: string; body: string };

const kurtas: DemoReview[] = [
  {
    rating: 5,
    title: 'Lovely fabric',
    body: 'Soft, breathable and the stitching is neat. Wore it all day in the heat without any trouble.',
  },
  {
    rating: 5,
    title: 'Exactly as pictured',
    body: 'The colour is just like the photos and the fit is true to size. Already ordered another.',
  },
  {
    rating: 4,
    title: 'Good everyday kurta',
    body: 'Comfortable and easy to wash. The sleeves are slightly long for me but nothing a tailor cannot fix.',
  },
  {
    rating: 5,
    body: 'Got so many compliments at a family dinner. The embroidery looks far more expensive than it was.',
  },
  {
    rating: 4,
    title: 'Nice, runs a little loose',
    body: 'Quality is great. I would size down if you prefer a closer fit.',
  },
  {
    rating: 3,
    title: 'Decent',
    body: 'Fabric is fine, but the colour was a shade lighter than I expected. Delivery was quick though.',
  },
];

const dupattas: DemoReview[] = [
  {
    rating: 5,
    title: 'Light and pretty',
    body: 'Drapes beautifully and the print has not faded after a few washes.',
  },
  { rating: 5, body: 'Matched perfectly with my suit. Soft on the skin and not see-through.' },
  {
    rating: 4,
    title: 'Good value',
    body: 'Nice length and colour. The edges could be finished a little better.',
  },
  { rating: 4, body: 'Pretty and light. Arrived well packed in three days.' },
];

const shawls: DemoReview[] = [
  {
    rating: 5,
    title: 'So warm',
    body: 'Warm without being heavy. Perfect for winter evenings and weddings.',
  },
  { rating: 5, body: 'Beautiful weave and very soft. Bought one for my mother as well.' },
  {
    rating: 4,
    title: 'Lovely shawl',
    body: 'Great quality for the price. Sheds a little at first but settles after a wash.',
  },
];

const shirts: DemoReview[] = [
  {
    rating: 5,
    title: 'Great fit',
    body: 'Fits well through the shoulders and the collar holds its shape. Good for the office.',
  },
  { rating: 4, body: 'Comfortable fabric and nice buttons. Needs ironing, as expected.' },
  {
    rating: 5,
    title: 'My new favourite',
    body: 'Light enough for summer and looks smart with jeans or trousers.',
  },
  {
    rating: 3,
    title: 'Okay',
    body: 'Fabric is good but the sleeves were a bit short for me. Exchanged for a larger size easily.',
  },
];

const waistcoats: DemoReview[] = [
  {
    rating: 5,
    title: 'Sharp',
    body: 'Wore it over a white kurta for a wedding and it looked great. Well tailored.',
  },
  { rating: 5, body: 'Excellent finishing and the lining is good quality. Fits as expected.' },
  {
    rating: 4,
    title: 'Smart waistcoat',
    body: 'Looks very smart. Slightly snug at the chest, so consider a size up.',
  },
];

const kids: DemoReview[] = [
  {
    rating: 5,
    title: 'Perfect for Eid',
    body: 'My son looked so smart and said it was comfortable all day. Washes well too.',
  },
  { rating: 5, body: 'Soft fabric that does not irritate my daughter’s skin. Pretty colours.' },
  {
    rating: 4,
    title: 'Cute and comfy',
    body: 'Lovely kurta. Sizes run a little big, which is fine since they grow so fast.',
  },
  { rating: 4, body: 'Good quality for kids’ clothes and held up after lots of play.' },
];

/** Review pools by the demo catalog's category slugs. */
export const demoReviews: Record<string, DemoReview[]> = {
  kurtas,
  'men-kurtas': kurtas,
  dupattas,
  shawls,
  shirts,
  waistcoats,
  boys: kids,
  girls: kids,
};
