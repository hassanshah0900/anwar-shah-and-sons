import { createHmac } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { FAKE_STRIPE_PORT, FAKE_STRIPE_URL, WEBHOOK_SECRET, WEBHOOK_URL } from './env.ts';

/**
 * Stands in for Stripe: the parts of its API the store calls, its payment page,
 * and correctly signed webhooks. The API uses the real Stripe SDK against this,
 * so request formats and signature checks are really exercised.
 */
type Session = {
  id: string;
  object: 'checkout.session';
  url: string | null;
  status: 'open' | 'complete' | 'expired';
  payment_status: 'paid' | 'unpaid';
  payment_intent: string | null;
  success_url: string;
  cancel_url: string;
  /** In Stripe's unit: cents, and paisa for PKR. */
  amount_total: number;
};

const sessions = new Map<string, Session>();
const refunded = new Set<string>();
let failRefunds = false;
let count = 0;

const readBody = async (request: IncomingMessage) => {
  let body = '';
  for await (const chunk of request) body += String(chunk);
  return new URLSearchParams(body);
};

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

const stripeError = (response: ServerResponse, status: number, code: string) =>
  json(response, status, {
    error: { type: 'invalid_request_error', code, message: `Fake Stripe: ${code}` },
  });

function createSession(form: URLSearchParams): Session {
  let amount = 0;
  for (let line = 0; form.has(`line_items[${line}][quantity]`); line++) {
    amount +=
      Number(form.get(`line_items[${line}][quantity]`)) *
      Number(form.get(`line_items[${line}][price_data][unit_amount]`));
  }
  const id = `cs_test_${++count}`;
  const session: Session = {
    id,
    object: 'checkout.session',
    url: `${FAKE_STRIPE_URL}/pay/${id}`,
    status: 'open',
    payment_status: 'unpaid',
    payment_intent: null,
    success_url: form.get('success_url') ?? '',
    cancel_url: form.get('cancel_url') ?? '',
    amount_total: amount,
  };
  sessions.set(id, session);
  return session;
}

async function sendWebhook(type: string, session: Session) {
  const payload = JSON.stringify({
    id: `evt_${session.id}_${type}`,
    object: 'event',
    type,
    data: { object: session },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  const result = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });
  if (!result.ok) throw new Error(`The webhook was answered with ${result.status}`);
}

function payment(session: Session) {
  session.status = 'complete';
  session.payment_status = 'paid';
  session.payment_intent = `pi_${session.id}`;
  session.url = null;
}

function paymentPage(session: Session): string {
  const button = (action: string, label: string) =>
    `<form method="post" action="/pay/${session.id}/${action}"><button>${label}</button></form>`;
  return `<!doctype html><title>Fake Stripe</title><h1>Fake Stripe</h1>
    <p id="amount">${session.amount_total / 100}</p>
    ${button('pay', 'Pay')}
    ${button('pay-without-webhook', 'Pay, webhook delayed')}
    <a href="${session.cancel_url}">Back</a>`;
}

async function route(request: IncomingMessage, response: ServerResponse) {
  const { pathname } = new URL(request.url ?? '/', FAKE_STRIPE_URL);
  const parts = pathname.split('/').filter(Boolean);
  const post = request.method === 'POST';
  const session = sessions.get(parts.at(-1) ?? '') ?? sessions.get(parts.at(-2) ?? '');

  // Stripe's API.
  if (pathname === '/v1/checkout/sessions' && post) {
    return json(response, 200, createSession(await readBody(request)));
  }
  if (pathname.startsWith('/v1/checkout/sessions/') && session) {
    if (pathname.endsWith('/expire') && post) {
      session.status = 'expired';
      session.url = null;
    }
    return json(response, 200, session);
  }
  if (pathname === '/v1/refunds' && post) {
    const intent = (await readBody(request)).get('payment_intent') ?? '';
    if (failRefunds) return stripeError(response, 400, 'refund_failed');
    if (refunded.has(intent)) return stripeError(response, 400, 'charge_already_refunded');
    refunded.add(intent);
    return json(response, 200, { id: `re_${intent}`, object: 'refund', status: 'succeeded' });
  }

  // Stripe's payment page.
  if (parts[0] === 'pay' && session) {
    if (!post) {
      response.writeHead(200, { 'content-type': 'text/html' });
      return response.end(paymentPage(session));
    }
    payment(session);
    if (parts[2] === 'pay') await sendWebhook('checkout.session.completed', session);
    response.writeHead(303, { location: session.success_url });
    return response.end();
  }

  // For the tests to change how Stripe behaves.
  if (pathname === '/test/fail-refunds' && post) {
    failRefunds = (await readBody(request)).get('fail') === 'true';
    return json(response, 200, { failRefunds });
  }
  if (parts[0] === 'test' && parts[1] === 'expire' && post && session) {
    session.status = 'expired';
    session.url = null;
    await sendWebhook('checkout.session.expired', session);
    return json(response, 200, session);
  }
  if (pathname === '/health') return json(response, 200, { ok: true });

  return stripeError(response, 404, 'not_found');
}

createServer((request, response) => {
  route(request, response).catch((error: unknown) => {
    console.error(error);
    if (!response.headersSent) response.writeHead(500);
    response.end(String(error));
  });
}).listen(FAKE_STRIPE_PORT);
