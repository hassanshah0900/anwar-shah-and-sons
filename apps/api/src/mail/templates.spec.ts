import type { Order } from '@repo/shared';
import { escapeHtml, orderPlacedEmail, passwordResetEmail } from './templates.js';

const order: Order = {
  number: 1001,
  status: 'pending',
  paymentMethod: 'cod',
  paymentStatus: 'unpaid',
  email: 'ayesha@example.com',
  address: {
    fullName: 'Ayesha <Khan>',
    phone: '+92 300 1234567',
    line1: '12 Mall Road',
    line2: null,
    city: 'Lahore',
    postalCode: '54000',
  },
  notes: null,
  currency: 'PKR',
  subtotal: 4000,
  shipping: 0,
  total: 4000,
  items: [
    {
      productName: 'Oxford Shirt',
      productSlug: 'oxford-shirt',
      variantLabel: 'Size: M',
      sku: 'OXFORD-M',
      imageKey: null,
      unitPrice: 2000,
      quantity: 2,
      lineTotal: 4000,
    },
  ],
  createdAt: '2026-11-04T10:00:00.000Z',
  updatedAt: '2026-11-04T10:00:00.000Z',
};

describe('email templates', () => {
  it('escapes HTML', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });

  it('puts the reset link in both bodies', () => {
    const email = passwordResetEmail({ name: 'Ayesha', url: 'https://shop.test/reset?token=abc' });
    expect(email.text).toContain('https://shop.test/reset?token=abc');
    expect(email.html).toContain('href="https://shop.test/reset?token=abc"');
  });

  it('summarises an order and escapes customer input', () => {
    const email = orderPlacedEmail({
      order,
      locale: 'en-PK',
      orderUrl: 'https://shop.test/account/orders/1001',
    });

    expect(email.subject).toBe('Order #1001 received');
    // Intl separates the symbol with a non-breaking space.
    expect(email.text).toMatch(/2 × Oxford Shirt \(Size: M\): Rs\s4,000/);
    expect(email.text).toContain('Shipping: Free');
    expect(email.text).toContain('Lahore 54000');
    expect(email.html).toContain('Ayesha &lt;Khan&gt;');
    expect(email.html).not.toContain('<Khan>');
  });
});
