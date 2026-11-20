# Rezide frontend

Next.js rebuild of the client-supplied **Rezide.in prototype**. It covers the seeker, owner and realtor journeys with the prototype's brand (wordmark, Montserrat / Special Gothic, black · white · mocaccino · timber green · burgundy palette) on a maintainable stack.

> **Prototype build.** Every listing, project, realtor, account record and dashboard record is **sample data** served by an in-process mock API. **Sign-in and sign-up are live**: they use the Rezide backend's OTP endpoints, as rezide.in does. No other message, payment, upload or verification reaches a real service.

## Stack

Next.js 16 (App Router, Cache Components, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix, retheme to Rezide tokens) · TanStack Query · Zustand · Axios (+ axios-mock-adapter) · React Hook Form + Zod · Leaflet (lazy-loaded) · Vitest + Testing Library.

## Setup

```bash
npm install
cp .env.example .env.local   # optional; defaults work
npm run dev                  # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next + React Compiler rules) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest unit and component tests |

### Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | Base URL for the real API (browser) |
| `API_SERVER_BASE_URL` | `NEXT_PUBLIC_API_BASE_URL` | Absolute API base for server-side requests (detail-page prefetch, metadata); server-only |
| `NEXT_PUBLIC_API_MOCKING` | `on` | `off` stops installing the mock adapter; a domain list such as `dashboard,account` mocks only those domains |
| `NEXT_PUBLIC_API_WITH_CREDENTIALS` | `false` | `true` sends cookies on cross-origin API requests (real session cookie) |
| `NEXT_PUBLIC_MOCK_DELAY_MS` | `250` | Simulated latency for mock responses |

### Live Find Realtor

Set `NEXT_PUBLIC_API_MOCKING=off` and restart the dev server to connect `/realtors` to the live broker directory. Its same-origin proxies use server-only `API_ORIGIN` (default `https://api.rezide.in`) and optional `REQUEST_SERVICE_SECRET`; never use a `NEXT_PUBLIC_` variable for the secret. See [the live integration contract](docs/API.md#live-find-realtor-integration) for endpoints, supported filters, pagination and limitations. Other pages retain their existing integration behavior. Do not submit test contact/invitation leads to production.

### Trying the journeys

- **Sign-in:** real OTP from the Rezide backend, sent by SMS to your mobile (4-digit codes). Use a number registered on rezide.in, or sign up first.
- Sign in as **Customer** for `/account` (switch Seeker/Owner inside) or as **Realtor** for `/dashboard`.
- Sample inventory is richest for **Mumbai**; Bengaluru, Pune, Hyderabad, Gurugram, Noida, Chennai and Ahmedabad have a few listings. Other cities show the empty state.

## Routes

| Route | Screen |
| --- | --- |
| `/`, `/homes/rent`, `/offices`, `/offices/lease`, `/retail[/lease]`, `/industrial[/lease]`, `/land[/lease]` | Properties home, one page per hero tab (category × Buy/Rent): hero search, rails with real counts |
| `/projects`, `/projects/ready-to-move`, `/projects/new-launches` | Projects home, one page per status tab |
| `/properties` | Properties listing page (was `/search`, which now redirects): URL-synced filters, chips, sort, per-page, pagination, list/map |
| `/properties/[id]`, `/projects/[id]` | Property and project details in the rezide.in v1 detail design (gallery tabs, key features, visit details, info tabs, project summary, plans, amenities, connectivity, RERA, transactions, developer, similar/nearby) |
| `/projects/search`, `/projects/[id]` | Project results (multi-select filters with live counts) and details |
| `/realtors` | Find Realtor (by name/firm, filters, credential explainers) |
| `/realtors/[firm]`, `/realtors/[firm]/[agent]` | Broker firm and agent pages in the rezide.in v1 detail design: profile, contact card, Sale/Rental listings (`?intent=rent&page=2`), team / other agents. Old `/realtors/<firm>-<agent>` ids redirect permanently |
| `/list-property` | Landing, OTP gate, 5- or 10-step listing wizard with live preview |
| `/login`, `/signup` | Customer and realtor sign-in/sign-up (`?role=realtor`, `?next=`) |
| `/account` | Seeker (viewed, shared, shortlisted, visits, offers, rejected) and owner (listings, visits, offers) areas, profile, settings |
| `/realtor-corner` | Ai-R agents, plans and pricing, order summary, trial request, FAQ, callback |
| `/dashboard/*` | Realtor CRM: contacts (table/list view, columns, actions, CSV export), `contacts/new`, `contacts/[id]`, `contacts/[id]/edit`, `contacts/[id]/associate`, groups, database uploads, credits, teams (+ `teams/new`), firm/my profile |

## Architecture

```
src/
  app/                 routes (site, auth and dashboard layouts); pages are thin
  components/brand     Logo + inline icon set generated from the prototype SVGs
  components/common    Field, PhoneInput, OtpInput, Segmented, ChoiceChips, dialogs, pagination…
  components/ui        shadcn/ui primitives, rethemed
  features/<domain>    search, properties, projects, realtors, enquiry, auth, account, listing, corner, dashboard, location
  lib/                 api client, query options, constants, validation, formatting, navigation
  services/            typed service functions (the API contract)
  stores/              Zustand: demo session, preferences (city), listing draft
  mocks/               mock adapter, handlers and fixed fixtures
  content/             marketing photography references
  types/models.ts      domain models
```

- **Server vs client.** Pages are Server Components. Detail pages prefetch on the server into TanStack Query (`HydrationBoundary`) and stream inside `<Suspense>`, as Cache Components requires for `params`/`searchParams`. Interactive sections are Client Components.
- **State.** Remote data → TanStack Query (`src/lib/queries.ts`). Search criteria, sort, page and view → URL (`useUrlCriteria`). Session, preferred city and the listing draft → Zustand (persisted). Everything else → component state.
- **Tabs are pages.** Every hero tab on the home pages is its own URL (`src/lib/home-routes.ts`), prerendered with its own title and description. The hero sits in a shared layout, so it stays mounted while tabs navigate (typed text survives; only the photo and rails change), and Back/Forward, bookmarks and "open in new tab" work. `/homes` and the wrong lease word (`/offices/rent`) redirect permanently to the canonical path. In-page view switches that don't change what the page *is* (the rails' Location/Budget/Size toggle, dialogs) stay in component state.
- **Detail pages** follow the rezide.in v1 detail design; landing and listing pages follow the new prototype. Shortlist and Compare are saved on this device only (`src/stores/saved.ts`). Brochures, RERA lookups, transaction records and maps beyond OpenStreetMap aren't connected and say so.
- **Search** filters a fixed dataset with pure functions (`features/search/match.ts`); filters OR within a group and AND across groups. Nothing is generated from the query.

## Mock services and pending integrations

**The API contract for the backend team is [`docs/API.md`](docs/API.md)**: conventions (errors, pagination, INR/ISO units), every endpoint with types, validation and status codes, the screens that use it, and an integration checklist.

All mock endpoints live in `src/mocks/handlers.ts` (CRM: `src/mocks/fixtures/dashboard-handlers.ts`) behind the shared Axios instance (`src/lib/api/client.ts`). UI code reaches them only through `src/services/*` and the query options in `src/lib/queries.ts`; nothing outside `src/mocks` reads fixtures (apart from tests and the demo OTP constant shown while auth is mocked). Point `NEXT_PUBLIC_API_BASE_URL` at a backend implementing the same contract and set `NEXT_PUBLIC_API_MOCKING=off`, or list the domains that should stay mocked while the rest go live.

| Endpoint | Mock behaviour | Needed for production |
| --- | --- | --- |
| `GET /properties`, `/properties/:id`, `/properties/stats`, `/properties/facets`, `/properties/groups` | Filters fixed fixtures; facets and locality/project groups computed by the reference functions in `features/search/match.ts` | Listings search service with faceting, media CDN, real verification status |
| `GET /projects…`, `GET /realtors…`, `GET /firms…` | Fixed fixtures; realtors paginated | Project catalogue, realtor directory, RERA/GST/NAR verification |
| `POST /enquiries` | Stored in memory; nobody notified | Lead routing / messaging (SMS, WhatsApp, email) |
| Auth: `/user/user/*` (login OTP, SMS OTP, `add/customer`, `logout`) | **Live**, never mocked (`src/services/auth.ts`) | httpOnly session cookie or token from the backend, server-side authorisation, proxy guards |
| `POST /listings` | Stored in memory | Listings write API, photo/video upload, document (POA) upload, verification workflow |
| `GET /account/*` | Sample activity for every user (raw records; the UI formats dates and prices) | Per-user saved/visit/offer data, offer/visit write endpoints |
| `POST /callbacks`, `POST /trial-requests` | Stored in memory | CRM / sales follow-up |
| `GET/POST/PATCH/PUT/DELETE /dashboard/*` | Sample firm data; edits last until reload; includes the Associate Property project/unit lookup | Realtor CRM API, uploads, teams, credits ledger |
| Checkout (Realtor Corner) | **Disabled**: shows an order summary only | Payment gateway, invoicing, NAR membership check |
| Price analysis, valuation report | Fixed illustrative ranges / disabled | Registered-transaction data, valuation service |

**Security note:** the signed-in user is kept as plain JSON in `localStorage` because the backend issues no token or cookie yet. It is not secure authentication and must not gate anything sensitive. The dashboard and account guards are client-side conveniences only. The seams for real auth are in place but inactive: `withCredentials` for an httpOnly session cookie, an optional bearer-token hook, and a 401 handler that signs out and redirects to `/login?next=` (`configureAuth` in `src/lib/api/client.ts`, wired in `src/app/providers.tsx`; see docs/API.md → Auth).

### Pending content

Footer items without destinations (About Us, Careers, Blog, Help Centre, Support, Privacy Policy, Terms of Use, Cookies Policy) are shown as unlinked text, and sign-up copy says the terms are not yet published. App-store links, product demo videos and audio testimonials are marked "coming soon".

## Prototype issues addressed

1. Desktop and mobile menus render from one `NAV_ITEMS` list (tested).
2. "Detect my location" uses the Geolocation API with denied / unavailable / timeout / out-of-range states; it never silently picks a city.
3. OTPs are 6 digits everywhere (`OTP_LENGTH`), replacing the prototype's mix of 4 and 6.
4. Simulated sign-in is labelled as such wherever it appears.
5. Navigating home keeps the session; only **Sign out** or expiry (12 h) ends it.
6. Search text and every filter change the results; counts come from the data.
7. Empty states explain what was searched and offer next steps.
8. Sample listings, "Verified (sample)" badges, registrations, payments and other simulated actions are visibly marked; success messages say when nothing was actually sent.
9. Copy fixes, e.g. "Homes Every Stage." → "Homes for every stage.", and the pincode hint (6 digits, not 4).

## Foldables and dual-screen devices

- **Narrow and unusual widths.** Every route is checked with no horizontal scroll at 280 px (Galaxy Fold cover), 344 px (Z Fold 5 cover), 540 px (Surface Duo single screen), 673 px / 841 px (Z Fold / Pixel Fold inner screens) and 1114 px (Surface Duo spanned). Responsive grids always declare a base `grid-cols-1`, so on narrow screens a column can't grow wider than the viewport.
- **Two screen segments.** When a device reports two segments (spanned across two screens, or half-folded in book or table-top posture), `FoldWatcher` (`src/components/layout/fold-watcher.tsx`) mirrors the Viewport Segments API onto `<html data-fold="x|y">` with pixel geometry: `--seg-0-width`, `--seg-1-left`, `--seg-1-width`, `--hinge-width` for a vertical hinge; `--seg-0-height`, `--seg-1-top`, `--seg-1-height`, `--hinge-height` for a horizontal one.
  - Tailwind variants: `fold-x:` (side-by-side segments) and `fold-y:` (stacked segments). Example: `fold-x:grid-cols-[var(--seg-0-width)_var(--seg-1-width)]! fold-x:gap-x-(--hinge-width)`.
  - Built in: centred dialogs and toasts move off the hinge (right screen when the hinge is vertical, bottom screen when it is horizontal). The properties map view uses two panes: map on one screen, results on the other (table-top: map pinned to the top screen, results scroll on the bottom one).
  - Single-screen devices are unaffected.
- **Testing.** Chrome DevTools → device toolbar → choose *Surface Duo* or *Galaxy Z Fold 5* / *Asus Zenbook Fold*, then use the "Toggle dual-screen mode" / posture control. In automated tests, emulate a hinge with the DevTools protocol: `Emulation.setDeviceMetricsOverride({ …, displayFeature: { orientation: "vertical", offset: 543, maskLength: 28 } })`.

## Known limitations

- The prototype's Age (Ready to Move) and Recency (New Launches) project rails aren't built: the catalogue has no completion or launch dates yet. Those tabs show Budget and Location.
- Unknown property/project/realtor ids render the not-found page, but because content streams after the shell the HTTP status is 200.
- In the realtor dashboard, edits (contacts, groups, team, firm and profile) are kept in memory by the mock API and reset on reload. File uploads record the file name only. Leads, Listing, Inventory, Marketing, Customisation, WhatsApp Templates, Integration, Subscription and Upload History are shown as unavailable.
- The signed-in prototype swaps the header for a "Back to Rezide" bar on account pages; the build keeps the main navigation there.
- Brand mocaccino (`#A3835F`) fails WCAG AA for small text on white, so text uses a darker `--rez-mocaccino-ink`; the brand hue is kept for bars, dots and large display text.
#   r e z i d e . i n - v 2  
 
