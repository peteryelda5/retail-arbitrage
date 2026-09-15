# Retail Arbitrage / FBA Opportunity Engine

Next.js (App Router, TypeScript) admin dashboard + ingestion API for a retail-arbitrage
system: Android "phone farm" collectors report retailer pricing → backend matches to
Amazon ASINs → calculates true FBA profitability → surfaces BUY/WATCH/PASS opportunities.

## Working on this with a partner

This repo has no git history yet — you're setting that up now. Once it's pushed:

1. **Create the GitHub repo** (empty, no README/license from GitHub's side — this project already has both) and push this code to it (see "Pushing this to GitHub" below).
2. **Add your partner as a collaborator**: repo → Settings → Collaborators → Add people.
3. **Connect the repo to Vercel**: Vercel dashboard → this project → Settings → Git → Connect Repository. After this, every push to `main` auto-deploys, and every branch/PR gets its own preview URL — you stop needing manual deploys entirely.
4. **Invite your partner to Vercel**: Vercel dashboard → project or team → Settings → Members → Invite.
5. **Invite your partner to Supabase**: Supabase dashboard → project → Project Settings → Team → Invite Member.
6. Each of you clones the repo locally, works on a branch, and opens a pull request into `main` to merge. Copy `.env.local.example` to `.env.local` locally (never commit it — `.gitignore` already excludes it) and fill in the real values from Supabase and this README's env var section below.

### Pushing this to GitHub for the first time

```bash
cd retail-arb-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Stack
- Next.js 14 (App Router) + TypeScript
- Supabase Postgres + Auth (project: `kciqrambmaaxvfawbytg`, "retail Arb")
- Tailwind CSS (dark-mode admin UI)
- Deployed on Vercel

## Project structure
```
app/
  page.tsx                 Dashboard (stats + recent opportunities)
  opportunities/            Full opportunity list with status filters
  retailers/ stores/ devices/ products/
  purchases/ inventory/ fba-shipments/
  settings/                 Editable min profit/ROI/margin/confidence thresholds
  api/observations/route.ts Phone-collector ingestion endpoint (POST)
  api/settings/route.ts     Settings read/write API
lib/
  supabase/client.ts         Browser client (anon key, RLS-scoped)
  supabase/server.ts         Server component client (anon key, RLS-scoped, cookie session)
  supabase/admin.ts          Service-role client (bypasses RLS) — ingestion API only
  opportunity-engine.ts       Profit / ROI / margin math + BUY/WATCH/PASS decision
  matching-engine.ts          UPC/EAN + secondary-signal product matching w/ ambiguity guard
components/
  Sidebar.tsx  StatCard.tsx  OpportunityCard.tsx  DataTable.tsx
```

## Environment variables
Copy `.env.local.example` to `.env.local` and fill in the two blank secrets:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | already filled in |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | already filled in (publishable/anon key — safe client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → `service_role` key. **Server-only, never expose to the browser.** |
| `DEVICE_INGEST_API_KEY` | Make up a long random secret. This is the bearer token Android devices must send to `POST /api/observations`. |

## Local development
```bash
npm install
npm run dev
```

## Deploying to Vercel
This repo has **not** been auto-deployed — the Claude session doesn't have a connected
Vercel MCP tool in this environment, so create the project yourself:

1. Push this folder to a new GitHub repo (or use `vercel` CLI directly from this folder — `npx vercel`).
2. In Vercel: **Add New Project** → import the repo → it auto-detects Next.js.
3. Under **Environment Variables**, add all four vars from the table above.
4. Deploy. Do not reuse an existing Vercel project — this should be its own project per the spec.

## Testing the ingestion API end-to-end (MVP milestone)

1. **Register a device** (no UI for this yet — insert directly via Supabase SQL editor
   or the `Supabase:execute_sql` tool):
   ```sql
   insert into devices (device_name, device_identifier, status)
   values ('Test Phone 1', 'phone-001', 'active');
   ```

2. **POST a test observation:**
   ```bash
   curl -X POST https://<your-vercel-domain>/api/observations \
     -H "Authorization: Bearer <DEVICE_INGEST_API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{
       "device_id": "phone-001",
       "retailer": "Walmart",
       "store_id": "2872",
       "sku": "123456",
       "upc": "012345678905",
       "title": "Example Product 12oz",
       "price": 12.97,
       "regular_price": 29.97,
       "inventory_quantity": 8,
       "availability": "in_stock"
     }'
   ```
   This creates/updates the retailer, store, product, and retailer_listing, and logs the
   raw observation. No `opportunity` will appear yet — that requires a matching row in
   `amazon_listings` for the same `product_id` (see step 3).

3. **Add Amazon listing data for that product** (manually for now — the "update Amazon
   data" step of the pipeline, e.g. from an SP-API/Keepa sync job, isn't built yet):
   ```sql
   insert into amazon_listings (product_id, asin, title, buy_box_price)
   select id, 'B000EXAMPLE', 'Example Product 12oz', 24.99 from products where upc = '012345678905';
   ```

4. **Re-POST the same observation** (or any new one for that product) — the response now
   includes a calculated `opportunity` object, and it will appear in the dashboard's
   Opportunities page.

## What's built vs. what's next
**Built:** schema (14 tables, RLS, indexes), opportunity math engine, matching engine
with pack/variant ambiguity guard, ingestion API implementing the full 8-step pipeline,
dark-mode dashboard with all 10 nav sections wired to live Supabase queries, editable
settings.

**Not built yet (explicitly out of scope for this pass):**
- Amazon-side sync job (SP-API/Keepa/etc.) to keep `amazon_listings`/`amazon_snapshots` fresh
- Auth/login screen (RLS is authenticated-only, but there's no sign-in page yet — add
  Supabase Auth UI before giving anyone but you access)
- Purchase-approval actions (buttons to move an opportunity → approved → purchased)
- Android collector app itself
