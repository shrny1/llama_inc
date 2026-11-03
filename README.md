# Llama Inc. — Stripe Checkout subscription demo

A small landing page for a fictional travel-assistant startup, with a Premium plan sold through Stripe Checkout (subscription mode), a success page, and the Stripe customer portal for managing or canceling.

Runs entirely in Stripe test mode / sandbox.

## What's here

| File | What it does |
|---|---|
| `server.js` | Express server. Creates Checkout Sessions, reads the price from Stripe, opens the customer portal, and has an optional webhook endpoint. |
| `public/index.html` | Landing page and pricing. The Premium card is filled in live from your Stripe price. |
| `public/success.html` | Confirmation page after checkout, with a "Manage or cancel subscription" button. |
| `.env.example` | The settings the app needs. |

## Before you start (Stripe Dashboard, sandbox)

1. Product with a **recurring** price. Copy the Price ID (`price_…`).
2. Secret key (`sk_test_…`) from the API keys page.
3. Head office address in Tax settings (needed while automatic tax is on).
4. Customer portal: open Settings → Billing → Customer portal and click **Save** (or activate it) so portal sessions work in test mode.

## Run it locally

```
cp .env.example .env      # then paste your key and Price ID into .env
npm install
npm run dev
```

Open http://localhost:4242

## Deploy for free on Render

1. Create a **private** GitHub repo and upload these files (not `.env`, not `node_modules`).
2. On render.com: New → Web Service → connect the repo.
3. Settings:
   - Language: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: Free
4. Environment variables: add `STRIPE_SECRET_KEY` and `PRICE_ID` (and `ENABLE_TAX=false` if you skipped the tax address).
5. Create the service. Your public link is `https://<name>.onrender.com`.

Free Render services go to sleep after about 15 minutes without traffic, so the first visit after a break can take up to a minute to load.

## Optional: webhooks

1. In Workbench → Webhooks, add an endpoint at `https://<name>.onrender.com/webhook`.
2. Select `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the signing secret (`whsec_…`) into the `STRIPE_WEBHOOK_SECRET` environment variable on Render.

Events show up in Render's Logs tab.

## Note on AI use

Built with help from Claude (Anthropic). Disclose this in the friction log as the assignment asks.
