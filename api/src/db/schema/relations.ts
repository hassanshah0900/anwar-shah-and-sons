import { relations } from 'drizzle-orm';
import { accounts, sessions, users } from './auth.js';
import { cartItems, carts } from './cart.js';
import {
  categories,
  optionTypes,
  optionValues,
  productImages,
  productOptions,
  products,
  productVariants,
  variantOptionValues,
} from './catalog.js';
import { addresses, reviews } from './customers.js';
import { orderItems, orders } from './orders.js';

// Relations power `db.query.*` lookups with `with: { ... }`. They don't change the
// database; the foreign keys in the table definitions do that.

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  cart: one(carts),
  orders: many(orders),
  addresses: many(addresses),
  reviews: many(reviews),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryTree',
  }),
  children: many(categories, { relationName: 'categoryTree' }),
  products: many(products),
}));

export const optionTypesRelations = relations(optionTypes, ({ many }) => ({
  values: many(optionValues),
  products: many(productOptions),
}));

export const optionValuesRelations = relations(optionValues, ({ one, many }) => ({
  optionType: one(optionTypes, {
    fields: [optionValues.optionTypeId],
    references: [optionTypes.id],
  }),
  variants: many(variantOptionValues),
  images: many(productImages),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  options: many(productOptions),
  variants: many(productVariants),
  images: many(productImages),
  orderItems: many(orderItems),
  reviews: many(reviews),
}));

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  product: one(products, { fields: [productOptions.productId], references: [products.id] }),
  optionType: one(optionTypes, {
    fields: [productOptions.optionTypeId],
    references: [optionTypes.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  optionValues: many(variantOptionValues),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const variantOptionValuesRelations = relations(variantOptionValues, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantOptionValues.variantId],
    references: [productVariants.id],
  }),
  optionValue: one(optionValues, {
    fields: [variantOptionValues.optionValueId],
    references: [optionValues.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  optionValue: one(optionValues, {
    fields: [productImages.optionValueId],
    references: [optionValues.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));
