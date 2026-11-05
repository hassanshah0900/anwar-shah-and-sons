import { formatMoney, type Order } from '@repo/shared';
import type { MailMessage } from './mailer.js';

/**
 * Transactional emails. Each has a plain-text body and a simple HTML body in
 * the store's monochrome style. Every dynamic value is escaped.
 */

const STORE = 'Anwar Shah & Sons';

type Email = Omit<MailMessage, 'to'>;

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Wraps paragraphs (already-escaped HTML) and an optional button in the shared layout. */
function layout(body: string[], button?: { label: string; url: string }): string {
  const paragraphs = body
    .map((html) => `<p style="margin:0 0 16px;line-height:1.6">${html}</p>`)
    .join('');
  const cta = button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:3px;text-decoration:none">${escapeHtml(button.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#fff;color:#111;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px"><div style="max-width:560px;margin:0 auto"><p style="margin:0 0 32px;font-family:Georgia,serif;font-size:22px">${escapeHtml(STORE)}</p>${paragraphs}${cta}<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e5e5e5;color:#737373;font-size:13px">${escapeHtml(STORE)}</p></div></body></html>`;
}

export function passwordResetEmail({ name, url }: { name: string; url: string }): Email {
  return {
    subject: `Reset your ${STORE} password`,
    text: [
      `Hi ${name},`,
      'We received a request to reset your password. Use this link within the next hour:',
      url,
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ].join('\n\n'),
    html: layout(
      [
        `Hi ${escapeHtml(name)},`,
        'We received a request to reset your password. The link works for the next hour.',
        "If you didn't ask for this, you can ignore this email. Your password won't change.",
      ],
      { label: 'Reset password', url },
    ),
  };
}

type OrderEmailContext = { order: Order; locale: string; orderUrl: string };

function money(amount: number, { order, locale }: OrderEmailContext): string {
  return formatMoney(amount, order.currency, locale);
}

function itemLines(context: OrderEmailContext): string[] {
  return context.order.items.map((item) => {
    const options = item.variantLabel ? ` (${item.variantLabel})` : '';
    return `${item.quantity} × ${item.productName}${options}: ${money(item.lineTotal, context)}`;
  });
}

function totalLines(context: OrderEmailContext): string[] {
  const { order } = context;
  return [
    `Subtotal: ${money(order.subtotal, context)}`,
    `Shipping: ${order.shipping === 0 ? 'Free' : money(order.shipping, context)}`,
    `Total: ${money(order.total, context)}`,
  ];
}

function addressLines({ order }: OrderEmailContext): string[] {
  const { address } = order;
  return [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.postalCode].filter(Boolean).join(' '),
    address.phone,
  ].filter((line): line is string => Boolean(line));
}

const htmlLines = (lines: string[]) => lines.map(escapeHtml).join('<br>');

function placedNote(order: Order): string {
  return order.paymentMethod === 'card'
    ? "We've received your payment and are getting your order ready."
    : "We'll confirm it shortly. Payment is cash on delivery.";
}

function shippedNote(context: OrderEmailContext): string {
  return context.order.paymentMethod === 'cod'
    ? ` Please have ${money(context.order.total, context)} ready in cash when it arrives.`
    : '';
}

export function orderPlacedEmail(context: OrderEmailContext): Email {
  const { order } = context;
  const name = order.address.fullName;
  return {
    subject: `Order #${order.number} received`,
    text: [
      `Hi ${name},`,
      `Thank you for your order #${order.number}. ${placedNote(order)}`,
      itemLines(context).join('\n'),
      totalLines(context).join('\n'),
      `Shipping to:\n${addressLines(context).join('\n')}`,
      `View your order: ${context.orderUrl}`,
    ].join('\n\n'),
    html: layout(
      [
        `Hi ${escapeHtml(name)},`,
        `Thank you for your order <strong>#${order.number}</strong>. ${escapeHtml(placedNote(order))}`,
        htmlLines(itemLines(context)),
        htmlLines(totalLines(context)),
        `<strong>Shipping to</strong><br>${htmlLines(addressLines(context))}`,
      ],
      { label: 'View your order', url: context.orderUrl },
    ),
  };
}

export function orderShippedEmail(context: OrderEmailContext): Email {
  const { order } = context;
  return {
    subject: `Order #${order.number} is on its way`,
    text: [
      `Hi ${order.address.fullName},`,
      `Your order #${order.number} has shipped.${shippedNote(context)}`,
      `View your order: ${context.orderUrl}`,
    ].join('\n\n'),
    html: layout(
      [
        `Hi ${escapeHtml(order.address.fullName)},`,
        `Your order <strong>#${order.number}</strong> has shipped.${escapeHtml(shippedNote(context))}`,
      ],
      { label: 'View your order', url: context.orderUrl },
    ),
  };
}

function cancelledNote(order: Order): string {
  switch (order.paymentStatus) {
    case 'refunded':
      return 'Your payment has been refunded and should reach you within a few days.';
    case 'paid':
      return "We'll refund your payment and let you know.";
    default:
      return "You haven't been charged.";
  }
}

export function orderCancelledEmail(context: OrderEmailContext): Email {
  const { order } = context;
  return {
    subject: `Order #${order.number} was cancelled`,
    text: [
      `Hi ${order.address.fullName},`,
      `Your order #${order.number} was cancelled. ${cancelledNote(order)} If this is unexpected, reply to this email.`,
      `View your order: ${context.orderUrl}`,
    ].join('\n\n'),
    html: layout(
      [
        `Hi ${escapeHtml(order.address.fullName)},`,
        `Your order <strong>#${order.number}</strong> was cancelled. ${escapeHtml(cancelledNote(order))} If this is unexpected, reply to this email.`,
      ],
      { label: 'View your order', url: context.orderUrl },
    ),
  };
}
