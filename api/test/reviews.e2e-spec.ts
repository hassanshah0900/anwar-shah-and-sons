import { INestApplication } from '@nestjs/common';
import {
  productDetailSchema,
  productListingSchema,
  reviewEligibilitySchema,
  reviewHighlightsSchema,
  reviewListSchema,
  reviewSchema,
  type OrderStatus,
} from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { signUpAs } from './support/users.js';
import { eq } from 'drizzle-orm';
import type { Database } from '../src/db/connection.js';
import { orderItems, orders, products, reviews, users } from '../src/db/schema/index.js';
import { resetCatalog, testDatabase } from './support/database.js';

describe('Reviews (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let productId: string;
  let otherId: string;

  const http = () => request(app.getHttpServer());
  const post = (cookies: string[], path: string, body: object) =>
    http().post(`/api/v1${path}`).set('Cookie', cookies).set('Origin', WEB_ORIGIN).send(body);

  /** A customer with an order for the kurta in the given status. */
  async function customer(email: string, status: OrderStatus | null = 'delivered') {
    const cookies = await signUpAs(app, email);
    const [user] = await db
      .update(users)
      .set({ name: 'Sana Tariq Malik' })
      .where(eq(users.email, email))
      .returning({ id: users.id });
    if (status) {
      const [order] = await db
        .insert(orders)
        .values({
          userId: user!.id,
          email,
          status,
          paymentMethod: 'cod',
          currency: 'PKR',
          subtotal: 4990,
          shipping: 250,
          total: 5240,
          fullName: 'Sana Malik',
          phone: '+92 300 1234567',
          line1: '1 Mall Road',
          city: 'Lahore',
        })
        .returning({ id: orders.id });
      await db.insert(orderItems).values({
        orderId: order!.id,
        productId,
        productName: 'Lawn Kurta',
        variantLabel: 'M',
        sku: 'KURTA-M',
        unitPrice: 4990,
        quantity: 1,
        lineTotal: 4990,
      });
    }
    return cookies;
  }

  beforeAll(async () => {
    app = await createTestApp();
    db = testDatabase(app);
    await db.delete(orders);
    await resetCatalog(db);
    await db.delete(users);
    const admin = adminApi(app, await signUpAs(app, 'reviews-admin@example.com', 'admin'));
    const categoryId = (await admin.post('/categories', { name: 'Kurtas' }).expect(201)).body.id;
    const create = async (name: string) =>
      (await admin.post('/products', { name, categoryId, price: 4990 }).expect(201)).body.id;
    productId = await create('Lawn Kurta');
    otherId = await create('Silk Kurta');
    await db.update(products).set({ status: 'active' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts with no reviews and no rating', async () => {
    const list = reviewListSchema.parse(
      (await http().get('/api/v1/products/lawn-kurta/reviews').expect(200)).body,
    );
    expect(list).toEqual({ reviews: [], total: 0, distribution: [0, 0, 0, 0, 0] });
    const product = productDetailSchema.parse(
      (await http().get('/api/v1/products/lawn-kurta').expect(200)).body,
    );
    expect(product.rating).toEqual({ average: null, count: 0 });
  });

  it('only lets customers review what has been delivered to them', async () => {
    await http().get('/api/v1/products/lawn-kurta/reviews/eligibility').expect(401);

    const pending = await customer('pending@example.com', 'shipped');
    expect(
      reviewEligibilitySchema.parse(
        (
          await http()
            .get('/api/v1/products/lawn-kurta/reviews/eligibility')
            .set('Cookie', pending)
            .expect(200)
        ).body,
      ),
    ).toEqual({ canReview: false, reason: 'not-purchased' });
    await post(pending, '/products/lawn-kurta/reviews', {
      rating: 5,
      body: 'Not here yet but I love it.',
    }).expect(403);
  });

  it('takes one review per customer and keeps the rating up to date', async () => {
    const buyer = await customer('buyer@example.com');
    const review = reviewSchema.parse(
      (
        await post(buyer, '/products/lawn-kurta/reviews', {
          rating: 4,
          title: ' Soft lawn ',
          body: 'Breathable and the embroidery is neat.',
        }).expect(201)
      ).body,
    );
    expect(review).toMatchObject({ rating: 4, title: 'Soft lawn', author: 'Sana M.' });

    await post(buyer, '/products/lawn-kurta/reviews', {
      rating: 5,
      body: 'Trying to review it twice.',
    }).expect(409);
    expect(
      (
        await http()
          .get('/api/v1/products/lawn-kurta/reviews/eligibility')
          .set('Cookie', buyer)
          .expect(200)
      ).body,
    ).toEqual({ canReview: false, reason: 'already-reviewed' });

    const second = await customer('second@example.com');
    await post(second, '/products/lawn-kurta/reviews', {
      rating: 5,
      body: 'Fits true to size, lovely colour.',
    }).expect(201);

    const list = reviewListSchema.parse(
      (await http().get('/api/v1/products/lawn-kurta/reviews?pageSize=1').expect(200)).body,
    );
    expect(list.total).toBe(2);
    expect(list.reviews).toHaveLength(1);
    expect(list.distribution).toEqual([1, 1, 0, 0, 0]);

    const listing = productListingSchema.parse(
      (await http().get('/api/v1/products').expect(200)).body,
    );
    const card = listing.products.find((product) => product.id === productId);
    expect(card?.rating).toEqual({ average: 4.5, count: 2 });
    expect(listing.products.find((product) => product.id === otherId)?.rating.count).toBe(0);
  });

  it('refuses a review without a rating or text', async () => {
    const buyer = await customer('vague@example.com');
    await post(buyer, '/products/lawn-kurta/reviews', {
      rating: 6,
      body: 'Too many stars here.',
    }).expect(400);
    await post(buyer, '/products/lawn-kurta/reviews', { rating: 3, body: 'Ok' }).expect(400);
  });

  it('highlights well-rated reviews, one per product', async () => {
    const highlights = reviewHighlightsSchema.parse(
      (await http().get('/api/v1/reviews/highlights?limit=3').expect(200)).body,
    );
    expect(highlights.reviews).toHaveLength(1);
    expect(highlights.reviews[0]).toMatchObject({ rating: 5, product: { slug: 'lawn-kurta' } });
  });

  it('lets admins take a review down, updating the rating', async () => {
    const admin = adminApi(app, await signUpAs(app, 'moderator@example.com', 'admin'));
    const [first] = reviewListSchema.parse(
      (await http().get('/api/v1/products/lawn-kurta/reviews').expect(200)).body,
    ).reviews;
    await admin.delete(`/reviews/${first!.id}`).expect(204);
    await admin.delete(`/reviews/${first!.id}`).expect(404);

    const product = productDetailSchema.parse(
      (await http().get('/api/v1/products/lawn-kurta').expect(200)).body,
    );
    expect(product.rating.count).toBe(1);
  });

  it('removes reviews with their product', async () => {
    await db.delete(products).where(eq(products.id, productId));
    expect(await db.$count(reviews)).toBe(0);
  });
});
