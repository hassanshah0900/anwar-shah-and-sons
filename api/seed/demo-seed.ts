/**
 * Fills the store with demo data so it looks lived in: categories, products
 * with generated photos, sizes, colours and stock, customers with addresses,
 * and two months of orders for the dashboard.
 *
 *   npm run db:seed:demo -w api
 *
 * Additive and repeatable: anything that already exists (matched by slug or
 * email) is left alone, and nothing is deleted. Refuses to run with
 * NODE_ENV=production unless --force is passed.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { shippingFor, toMinorUnits } from '@repo/shared';
import { createAuth } from '../src/auth/auth.js';
import { and, asc, eq, inArray, like } from 'drizzle-orm';
import { validateEnv, type Env } from '../src/config/env.js';
import { createDatabase, createPool, type Database } from '../src/db/connection.js';
import * as schema from '../src/db/schema/index.js';
import { LocalStorageService } from '../src/storage/local-storage.service.js';
import { S3StorageService } from '../src/storage/s3-storage.service.js';
import type { StorageService } from '../src/storage/storage.js';
import {
  adultSizes,
  categories,
  colours,
  customers,
  DEMO_EMAIL_DOMAIN,
  DEMO_PASSWORD,
  kidsSizes,
  products,
} from './demo/catalog.js';
import { demoReviews } from './demo/reviews.js';

const DAY = 86_400_000;
const ORDER_COUNT = 60;
const ORDER_DAYS = 60;

/** A small seeded random number generator, so every run makes the same data. */
function random(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)]!,
  };
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function storageFor(env: Env): StorageService {
  return env.STORAGE_DRIVER === 's3'
    ? new S3StorageService({
        bucket: env.S3_BUCKET ?? '',
        region: env.S3_REGION ?? '',
        endpoint: env.S3_ENDPOINT,
      })
    : new LocalStorageService(env.STORAGE_LOCAL_DIR);
}

/** The option type with this slug, created if it doesn't exist yet. */
async function optionType(db: Database, values: typeof schema.optionTypes.$inferInsert) {
  const [existing] = await db
    .select({ id: schema.optionTypes.id })
    .from(schema.optionTypes)
    .where(eq(schema.optionTypes.slug, values.slug));
  if (existing) return existing;
  const [created] = await db
    .insert(schema.optionTypes)
    .values(values)
    .returning({ id: schema.optionTypes.id });
  return created!;
}

async function main() {
  const env = validateEnv(process.env);
  if (env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error(
      'Refusing to add demo data with NODE_ENV=production. Pass --force to override.',
    );
  }

  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const storage = storageFor(env);
  const rng = random(20261104);

  try {
    // ─── Options ───────────────────────────────────────────────────────────
    const colourType = await optionType(db, {
      name: 'Colour',
      slug: 'colour',
      kind: 'color',
      position: 0,
    });
    const sizeType = await optionType(db, {
      name: 'Size',
      slug: 'size',
      kind: 'text',
      position: 1,
    });

    const colourIds = new Map<string, string>();
    for (const [position, colour] of colours.entries()) {
      const [value] = await db
        .insert(schema.optionValues)
        .values({
          optionTypeId: colourType.id,
          slug: colour.slug,
          label: colour.label,
          colorHex: colour.hex,
          position,
        })
        .onConflictDoUpdate({
          target: [schema.optionValues.optionTypeId, schema.optionValues.slug],
          // Changes nothing, but makes the existing row come back.
          set: { slug: colour.slug },
        })
        .returning({ id: schema.optionValues.id });
      colourIds.set(colour.slug, value!.id);
    }

    const sizeIds = new Map<string, string>();
    for (const [position, label] of [...adultSizes, ...kidsSizes].entries()) {
      const slug = slugify(label);
      const [value] = await db
        .insert(schema.optionValues)
        .values({ optionTypeId: sizeType.id, slug, label, position })
        .onConflictDoUpdate({
          target: [schema.optionValues.optionTypeId, schema.optionValues.slug],
          set: { position },
        })
        .returning({ id: schema.optionValues.id });
      sizeIds.set(label, value!.id);
    }

    // ─── Categories ────────────────────────────────────────────────────────
    const categoryIds = new Map<string, string>();
    for (const [position, spec] of categories.entries()) {
      const [existing] = await db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(eq(schema.categories.slug, spec.slug));
      const [category] = existing
        ? [existing]
        : await db
            .insert(schema.categories)
            .values({
              name: spec.name,
              slug: spec.slug,
              description: spec.description,
              position,
              parentId: spec.parent ? categoryIds.get(spec.parent) : null,
            })
            .returning({ id: schema.categories.id });
      categoryIds.set(spec.slug, category!.id);
    }

    // ─── Products ──────────────────────────────────────────────────────────
    /**
     * Gives a product its photo (demo/photos/<slug>.webp), replacing older demo
     * images, so re-running the seed upgrades a catalog made by an earlier version.
     */
    const usePhoto = async (productId: string, slug: string, name: string): Promise<boolean> => {
      // Media URLs must be UUID file names; deriving it from the slug lets a re-run find it.
      const hex = createHash('sha256').update(`demo-photo:${slug}`).digest('hex');
      const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
      const key = `products/${productId}/${uuid}.webp`;
      const images = schema.productImages;
      if (
        await db.$count(images, and(eq(images.productId, productId), eq(images.storageKey, key)))
      ) {
        return false;
      }
      const old = await db
        .delete(images)
        .where(eq(images.productId, productId))
        .returning({ storageKey: images.storageKey });
      await Promise.all(old.map((image) => storage.delete(image.storageKey)));

      const body = await readFile(new URL(`./demo/photos/${slug}.webp`, import.meta.url));
      await storage.put(key, body, 'image/webp');
      await db.insert(images).values({
        productId,
        storageKey: key,
        contentType: 'image/webp',
        size: body.length,
        alt: name,
        position: 0,
      });
      return true;
    };

    let created = 0;
    let photographed = 0;
    for (const [index, spec] of products.entries()) {
      const [existing] = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.slug, spec.slug));
      if (existing) {
        if (await usePhoto(existing.id, spec.slug, spec.name)) photographed++;
        continue;
      }

      // Spread over the last six weeks, so "Newest" has an order to it.
      const createdAt = new Date(Date.now() - (products.length - index) * 2.3 * DAY);
      const [product] = await db
        .insert(schema.products)
        .values({
          name: spec.name,
          slug: spec.slug,
          description: spec.description,
          categoryId: categoryIds.get(spec.category)!,
          status: 'active',
          price: toMinorUnits(spec.price, env.STORE_CURRENCY),
          compareAtPrice: spec.compareAtPrice
            ? toMinorUnits(spec.compareAtPrice, env.STORE_CURRENCY)
            : null,
          createdAt,
        })
        .returning({ id: schema.products.id });
      const productId = product!.id;
      await db
        .insert(schema.productOptions)
        .values([
          { productId, optionTypeId: colourType.id, position: 0 },
          ...(spec.sizes ? [{ productId, optionTypeId: sizeType.id, position: 1 }] : []),
        ]);

      let position = 0;
      for (const colour of spec.colours) {
        for (const size of spec.sizes ?? [null]) {
          const valueIds = [colourIds.get(colour)!, ...(size ? [sizeIds.get(size)!] : [])];
          // Mostly in stock, a few running low or sold out.
          const roll = rng.next();
          const stock = roll < 0.04 ? 0 : roll < 0.1 ? rng.int(1, 3) : rng.int(6, 30);
          const [variant] = await db
            .insert(schema.productVariants)
            .values({
              productId,
              sku: [spec.slug, colour, size].filter(Boolean).join('-').toUpperCase(),
              stock,
              position: position++,
              combinationKey: [...valueIds].sort().join('+'),
            })
            .returning({ id: schema.productVariants.id });
          await db
            .insert(schema.variantOptionValues)
            .values(valueIds.map((optionValueId) => ({ variantId: variant!.id, optionValueId })));
        }
      }

      await usePhoto(productId, spec.slug, spec.name);
      created++;
    }
    console.log(
      `Products: ${created} added, ${products.length - created} already there` +
        (photographed ? `, ${photographed} given photos` : ''),
    );

    // ─── Customers ─────────────────────────────────────────────────────────
    const auth = createAuth(db, env);
    const shoppers: { id: string; email: string; name: string; city: string; line1: string }[] = [];
    for (const [index, person] of customers.entries()) {
      const email = `${slugify(person.name).replace('-', '.')}@${DEMO_EMAIL_DOMAIN}`;
      let [user] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email));
      if (!user) {
        await auth.api.signUpEmail({ body: { name: person.name, email, password: DEMO_PASSWORD } });
        [user] = await db
          .update(schema.users)
          .set({ createdAt: new Date(Date.now() - (ORDER_DAYS + 10 - index * 5) * DAY) })
          .where(eq(schema.users.email, email))
          .returning({ id: schema.users.id });
        await db.insert(schema.addresses).values({
          userId: user!.id,
          fullName: person.name,
          phone: `+92 30${rng.int(0, 4)} ${rng.int(1_000_000, 9_999_999)}`,
          line1: person.line1,
          city: person.city,
          isDefault: true,
        });
      }
      shoppers.push({ id: user!.id, email, ...person });
    }
    console.log(`Customers: ${shoppers.length} (password: ${DEMO_PASSWORD})`);

    // ─── Reviews ───────────────────────────────────────────────────────────
    // Made-up reviews, so the demo shop shows ratings. Products that already have
    // reviews are left alone, so a re-run never doubles them up.
    const reviewRng = random(20261106);
    let reviewed = 0;
    for (const spec of products) {
      const [product] = await db
        .select({
          id: schema.products.id,
          reviewCount: schema.products.reviewCount,
          createdAt: schema.products.createdAt,
        })
        .from(schema.products)
        .where(eq(schema.products.slug, spec.slug));
      if (!product) throw new Error(`Product ${spec.slug} is missing`);
      const texts = demoReviews[spec.category] ?? [];
      if (product.reviewCount > 0 || texts.length === 0) continue;

      const count = Math.min(reviewRng.int(2, 5), shoppers.length, texts.length);
      const authors = [...shoppers].sort(() => reviewRng.next() - 0.5).slice(0, count);
      const shuffled = [...texts].sort(() => reviewRng.next() - 0.5);
      for (const [index, author] of authors.entries()) {
        const text = shuffled[index]!;
        // Some days after the product appeared, never in the future.
        const age = Date.now() - product.createdAt.getTime();
        await db.insert(schema.reviews).values({
          productId: product.id,
          userId: author.id,
          rating: text.rating,
          title: text.title ?? null,
          body: text.body,
          createdAt: new Date(product.createdAt.getTime() + reviewRng.next() * age),
        });
      }
      reviewed++;
    }
    console.log(`Reviews: ${reviewed} products reviewed`);

    // ─── Orders ────────────────────────────────────────────────────────────
    const existingOrders = await db.$count(
      schema.orders,
      like(schema.orders.email, `%@${DEMO_EMAIL_DOMAIN}`),
    );
    if (existingOrders > 0) {
      console.log(`Orders: ${existingOrders} demo orders already there`);
      return;
    }

    const variants = await db.query.productVariants.findMany({
      where: inArray(
        schema.productVariants.productId,
        db
          .select({ id: schema.products.id })
          .from(schema.products)
          .where(
            inArray(
              schema.products.slug,
              products.map((spec) => spec.slug),
            ),
          ),
      ),
      columns: { id: true, sku: true, price: true },
      with: {
        product: {
          columns: { id: true, name: true, price: true },
          with: {
            options: {
              columns: { optionTypeId: true },
              orderBy: [asc(schema.productOptions.position)],
            },
            images: { columns: { storageKey: true, optionValueId: true } },
          },
        },
        optionValues: {
          columns: {},
          with: {
            optionValue: {
              columns: { id: true, label: true, optionTypeId: true },
              with: { optionType: { columns: { name: true } } },
            },
          },
        },
      },
    });

    const shipping = {
      flatRate: toMinorUnits(env.SHIPPING_FLAT_RATE, env.STORE_CURRENCY),
      freeOver:
        env.FREE_SHIPPING_OVER === undefined
          ? null
          : toMinorUnits(env.FREE_SHIPPING_OVER, env.STORE_CURRENCY),
    };

    // More orders recently: ages skew towards today. Created oldest first, so
    // order numbers rise with time as they would in a real store.
    const placedAt = Array.from({ length: ORDER_COUNT }, () => {
      const ageDays = Math.floor(ORDER_DAYS * rng.next() ** 1.6);
      return {
        ageDays,
        createdAt: new Date(Date.now() - ageDays * DAY - rng.int(0, 10) * 3_600_000),
      };
    }).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const { ageDays, createdAt } of placedAt) {
      const status =
        ageDays > 14
          ? rng.next() < 0.1
            ? 'cancelled'
            : 'delivered'
          : ageDays > 5
            ? rng.pick(['shipped', 'delivered', 'delivered'] as const)
            : ageDays > 1
              ? rng.pick(['confirmed', 'shipped'] as const)
              : rng.pick(['pending', 'pending', 'confirmed'] as const);
      const shopper = rng.pick(shoppers);
      // Card orders are paid at checkout, so only cash orders wait as pending.
      const paymentMethod = status !== 'pending' && rng.next() < 0.4 ? 'card' : 'cod';
      const paymentStatus =
        paymentMethod === 'cod'
          ? status === 'delivered'
            ? 'paid'
            : 'unpaid'
          : status === 'cancelled'
            ? 'refunded'
            : 'paid';

      const lines = Array.from({ length: rng.int(1, 3) }, () => rng.pick(variants));
      const items = [...new Map(lines.map((variant) => [variant.id, variant])).values()].map(
        (variant) => {
          const typeOrder = variant.product.options.map((option) => option.optionTypeId);
          const values = variant.optionValues
            .map(({ optionValue }) => optionValue)
            .sort((a, b) => typeOrder.indexOf(a.optionTypeId) - typeOrder.indexOf(b.optionTypeId));
          const image =
            variant.product.images.find((candidate) =>
              values.some((value) => value.id === candidate.optionValueId),
            ) ?? variant.product.images[0];
          const quantity = rng.next() < 0.8 ? 1 : 2;
          const unitPrice = variant.price ?? variant.product.price;
          return {
            variantId: variant.id,
            productId: variant.product.id,
            productName: variant.product.name,
            variantLabel: values
              .map((value) => `${value.optionType.name}: ${value.label}`)
              .join(' · '),
            sku: variant.sku,
            imageKey: image?.storageKey ?? null,
            unitPrice,
            quantity,
            lineTotal: unitPrice * quantity,
          };
        },
      );
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const shippingCharge = shippingFor(subtotal, shipping);

      const [order] = await db
        .insert(schema.orders)
        .values({
          userId: shopper.id,
          email: shopper.email,
          status,
          paymentMethod,
          paymentStatus,
          currency: env.STORE_CURRENCY,
          subtotal,
          shipping: shippingCharge,
          total: subtotal + shippingCharge,
          fullName: shopper.name,
          phone: '+92 300 1234567',
          line1: shopper.line1,
          city: shopper.city,
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: schema.orders.id });
      await db
        .insert(schema.orderItems)
        .values(items.map((item) => ({ ...item, orderId: order!.id })));
    }
    console.log(`Orders: ${ORDER_COUNT} added over the last ${ORDER_DAYS} days`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
