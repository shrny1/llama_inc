// Llama Inc. — Stripe Checkout subscription demo
// Runs locally with `npm run dev` (reads .env) and on Render with `npm start`
// (reads environment variables set in the Render dashboard).

const express = require('express');
const Stripe = require('stripe');

const {
  STRIPE_SECRET_KEY,
  PRICE_ID,
  STRIPE_WEBHOOK_SECRET, // optional
  ENABLE_TAX = 'true',   // set to "false" to turn off automatic tax
  PORT = 4242,
} = process.env;

if (!STRIPE_SECRET_KEY || !PRICE_ID) {
  console.error('Missing STRIPE_SECRET_KEY or PRICE_ID. See .env.example.');
  process.exit(1);
}

const stripe = Stripe(STRIPE_SECRET_KEY);
const app = express();
app.set('trust proxy', true); // so https URLs are built correctly behind Render

const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// ---- Webhook (optional). Must be registered before body parsers. ----
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!STRIPE_WEBHOOK_SECRET) return res.sendStatus(404);
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature check failed:', err.message);
    return res.sendStatus(400);
  }
  switch (event.type) {
    case 'checkout.session.completed':
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      console.log(`[webhook] ${event.type} — ${event.data.object.id}`);
      break;
    default:
      break;
  }
  res.sendStatus(200);
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));

// ---- Product + price, read live from Stripe so the page never drifts ----
let cachedConfig = null;
app.get('/config', async (req, res) => {
  try {
    if (!cachedConfig) {
      const price = await stripe.prices.retrieve(PRICE_ID, { expand: ['product'] });
      cachedConfig = {
        name: price.product.name,
        description: price.product.description,
        image: price.product.images?.[0] || null,
        unitAmount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        intervalCount: price.recurring?.interval_count || 1,
      };
    }
    res.json(cachedConfig);
  } catch (err) {
    console.error('Could not load price:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---- Start Checkout ----
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      automatic_tax: { enabled: ENABLE_TAX === 'true' },
      integration_identifier: 'llama-premium-hosted',
      success_url: `${baseUrl(req)}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl(req)}/?canceled=true`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    // Don't crash the server: log it and show the message on the page.
    console.error('Checkout Session error:', err.message);
    res.redirect(303, `/?error=${encodeURIComponent(err.message)}`);
  }
});

// ---- Success page lookup ----
app.get('/session-status', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {
      expand: ['subscription'],
    });
    res.json({
      status: session.status,
      email: session.customer_details?.email || null,
      subscriptionStatus: session.subscription?.status || null,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- Customer portal (manage / cancel subscription) ----
app.post('/create-portal-session', async (req, res) => {
  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(req.body.session_id);
    const portal = await stripe.billingPortal.sessions.create({
      customer: checkoutSession.customer,
      return_url: baseUrl(req),
    });
    res.redirect(303, portal.url);
  } catch (err) {
    console.error('Portal error:', err.message);
    res.redirect(303, `/?error=${encodeURIComponent(err.message)}`);
  }
});

app.listen(PORT, () => console.log(`Llama Inc. running on http://localhost:${PORT}`));
