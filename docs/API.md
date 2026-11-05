# Rezide API contract (v0, from the frontend)

This is the HTTP API the Rezide frontend calls. Today every endpoint is answered by an in-process mock (`src/mocks/`); the backend implements the same contract and the frontend switches over with environment variables (see [Integration checklist](#integration-checklist)).

The contract is derived from the code, which stays the source of truth:

| What | Where |
| --- | --- |
| Request/response types | `src/types/models.ts` (catalogue, auth, enquiries, listings, account), `src/types/dashboard.ts` (CRM), service files below |
| One function per endpoint | `src/services/catalog.ts`, `account.ts`, `mutations.ts`, `dashboard.ts` |
| Query keys / caching | `src/lib/queries.ts` |
| Reference behaviour (filtering, sorting, facets, grouping) | `src/features/search/match.ts`, `src/features/search/criteria.ts` |
| Mock implementation | `src/mocks/handlers.ts`, `src/mocks/fixtures/dashboard-handlers.ts` |
| Contract tests (run against the mock) | `src/services/services.test.ts`, `src/lib/api/api.test.ts`, `src/features/**/*.test.ts` |

Status markers used below: **[impl]** the frontend calls this today; **[proposed]** recommended addition, not called yet.

---

## 1. Conventions

### Base URL

- Browser: `NEXT_PUBLIC_API_BASE_URL` (default `/api`). Paths below are relative to it, e.g. `GET {base}/properties`.
- Server (Next.js server components, metadata): `API_SERVER_BASE_URL` if set, else the same value. **Must be absolute** when the public one is relative (Node can't resolve `/api`).
- JSON only: `Accept: application/json`; bodies are `application/json; charset=utf-8`.

### Units and formats

| Kind | Format |
| --- | --- |
| Money | **INR as integer rupees** (no paise, no strings). `price` is the total sale price, or the **monthly** rent when `intent` is `rent`. Never send pre-formatted text like `"₹ 7.40 Cr"`; the UI formats (`src/lib/format.ts`, `src/features/account/presenters.ts`). |
| Dates | ISO 8601. Calendar dates `YYYY-MM-DD`; instants `YYYY-MM-DDTHH:mm:ss.sssZ`. Times of day (visits) `HH:mm` in IST. |
| Area | Square feet (`areaSqft`, `areaMin`, `areaMax`), numbers. |
| Coordinates | `[lat, lng]` tuple (`LatLng`). |
| Mobile numbers | 10 digits starting 6–9 (`^[6-9]\d{9}$`). The UI sends bare digits for auth/enquiries; CRM fields may contain a space (`"98200 87676"`), so normalise by taking the last 10 digits. |
| Ids / slugs | Opaque strings, URL-safe (they appear in page URLs: `/properties/{id}`, `/projects/{id}`, `/realtors/{firmSlug}/{agentSlug}`). Keep them stable; SEO depends on them. |
| Enum casing | As listed per type (mostly lowercase codes, e.g. `buy`/`rent`, `uc`/`rtm`/`nl`). Some catalogue enums are display-cased today (`Furnishing`, `Facing`, `MediaType`, CRM `ContactType`) and are matched case-insensitively by the search. |

### Errors

Every 4xx/5xx response has this body (`ApiErrorBody` in `src/lib/api/client.ts`):

```json
{ "message": "Please fix the highlighted fields.", "code": "validation", "fieldErrors": { "phone": "Enter a valid 10-digit Indian mobile number." } }
```

- `message` (required): safe to show to the user as-is.
- `code` (optional): machine code. Codes the UI or tests rely on: `validation` (422), `not_found` (404), `otp_not_requested` (400), `otp_invalid` (401), `seats_full` (409). Also used by the mock: `bad_request` (400). Suggested: `unauthenticated` (401), `forbidden` (403), `rate_limited` (429), `internal` (500).
- `fieldErrors` (optional, 422): `{ [bodyFieldName]: message }`, keyed by the **request body field name**. Forms copy these onto their inputs (`applyFieldErrors` in `src/lib/api/form-errors.ts`; the lead and contact forms map `name` → `firstName`). Omit it, or send `{}`, when no single field is at fault.
- The client normalises every failure to `ApiError { status, message, code?, fieldErrors? }`. No response (network/CORS/timeout) → `status: 0`, `code: "network" | "timeout"`. Non-JSON error bodies fall back to a generic message.

Status codes used: `200` read/update, `201` create, `204` delete (no body), `400` malformed request, `401` not signed in / wrong OTP, `403` signed in but not allowed, `404` unknown id, `409` conflict (seat limit), `422` validation, `429` OTP/enquiry rate limits (recommended), `5xx`.

Detail pages call `notFound()` on a **404**; any other error renders an error state with Retry. Return 404 (not 200 with `null`) for unknown ids.

### Pagination

List endpoints that can grow return `Paginated<T>`:

```ts
type Paginated<T> = { items: T[]; total: number; page: number; perPage: number; pageCount: number };
```

- Request params: `page` (1-based, default 1) and `per` (page size). Properties/projects accept `per` ∈ {9, 18, 27, 36} (default 9); realtors default 50, max 100.
- `page` beyond the last page is **clamped** to the last page (the response's `page` says which page was served); `pageCount` is at least 1 even when `total` is 0.
- Small, bounded lists (CRM groups, uploads, team, an account's visits) are plain arrays.

### Query-string arrays

Repeated keys, no brackets: `?bhk=2+BHK&bhk=3+BHK&loc=Worli&loc=Powai` (Axios `paramsSerializer: { indexes: null }`). The listing pages use the **same parameter names in their own URLs**, so a page URL's query string is also a valid API query.

### Authentication

See [§4 Auth](#4-auth-otp). Summary: endpoints under `/account/*`, `/dashboard/*` and `POST /listings` require a signed-in user (the mock does not check). Catalogue reads are public. Sign-in uses the Rezide backend's OTP endpoints (`/user/user/*`), which issue no token or cookie today; a cookie or bearer-token hook is ready for when they do. A `401` from any endpoint except the OTP ones signs the user out and redirects to `/login?next=<current page>` (`/login?role=realtor&next=…` under `/dashboard`).

---

## 2. Catalogue: properties

Model `Property` (`src/types/models.ts`). Key fields: `id`, `title`, `category` (`homes|offices|retail|industrial|land`), `intent` (`buy|rent`), `unitType`, `city`, `locality`, `projectId?`, `projectName?`, `price` (INR), `areaSqft`, `areaBasis` (`Carpet|Built-up|Plot`), `bhk?`, `bathrooms?`, `parking?`, `furnishing?`, `facing?`, `media` (`Video|Photo|VR Tour`[]), `specs`, `amenities`, `description`, `images` (URLs), `coords`, `realtorId`, `realtorFirm`, `verification` (`verified|pending`), `updatedAt` (ISO instant), plus optional detail-page fields (`listedAt`, `availableFrom`, `securityDeposit`, `keyFeatures`, `visit`, `region`, `subRegion`, `rooms`, `landmarks`, `complexImages`, `planImages`, `videoUrl`, …). Search results may omit the heavy optional detail fields; the detail endpoint must include them.

### Search parameters (shared by `/properties`, `/properties/facets`, `/properties/groups`)

| Param | Type | Meaning |
| --- | --- | --- |
| `city` | string, required | Exact city, case-insensitive (default in UI: `Mumbai`). |
| `intent` | `buy`\|`rent` | Default `buy`. |
| `type` | category | `homes`\|`offices`\|`retail`\|`industrial`\|`land`. Default `homes`. (Named `type` because it is also the page URL param.) |
| `q` | string | Free text. Split on whitespace; **every token** must appear (substring, case/diacritic-insensitive) in at least one of `title`, `locality`, `projectName`, `unitType`, `city`. |
| `loc` | string[] | Localities (exact, case-insensitive). |
| `unit` | string[] | Unit types (`UNIT_TYPES` in `src/lib/constants.ts`). |
| `bhk` | string[] | `"1 BHK"…"4 BHK"`, `"5+ BHK"` (n+ = at least n). |
| `furnishing` | string[] | `Fully Furnished`\|`Semi Furnished`\|`Unfurnished`. |
| `bath` | string[] | `"1"…"4"`, `"5+"`. |
| `parking` | string[] | `"1"…"3"`, `"4+"`. |
| `media` | string[] | `Video`\|`Photo`\|`VR Tour`: listing has **any** of them. |
| `facing` | string[] | 8 compass values (`North East`, …). |
| `project` | string[] | Project ids. |
| `min`, `max` | int INR | Inclusive price bounds (monthly rent for `rent`). Swapped if inverted. |
| `areaMin` | int sq ft | Inclusive lower bound. |
| `areaMax` | int sq ft | **Exclusive** upper bound. Swapped if inverted. |
| `sort` | `latest`\|`price-asc`\|`price-desc`\|`area-desc` | Default `latest` (= `updatedAt` desc). Ties broken by `id` asc so paging is stable. |
| `page`, `per` | int | See pagination. |
| `view` | ignored | UI-only (`list|map|loc|proj`); the client never sends it. |

**Filter semantics** (`matchesProperty`): values **within** one group are OR-ed; groups are AND-ed with each other and with `city`, `intent`, `type`, `q`, budget and area. A listing missing a field (e.g. no `bhk`) fails a non-empty filter on that field. Unknown/invalid values are ignored by the parser rather than rejected (pages are shareable URLs); the backend may do the same or return 400, but should not 500.

### `GET /properties` [impl]

Search. Response `Paginated<Property>`. Used by `/properties` (list and map views), the map pins (current page only).

**Live.** The browser calls this app's route `GET /api/properties?<page query>` (`src/app/api/properties/route.ts`), which reads the query with `parsePropertyCriteria` and calls the Rezide backend's `POST /inventory/Listing/mobile/all` on the server (`src/services/properties.ts`), as rezide.in's `/api/listings` does. `src/services/property-mapper.ts` writes the backend body (city as the master's name, BHK and furnishing as master ids, bathrooms/parking `5+` → `["5", ">"]`, facing as `N`/`NE`/…, text and localities in `project_names_localities`, sort labels such as `"Price (High to Low)"`) and maps each listing to `Property`. When `priceHide` is set the price is never read, so it can't reach the browser: the card shows "Price on request". The total is `result_sale` or `result_rent`. Photos come from `https://cdn.rezide.in/images/{key}.jpeg` (own photos, else project sample flats, else project photos, else `/images/listing-placeholder.jpg`). The backend only holds homes, so other categories return no listings without a call. Unit type is sent as `project_type`; the media filter has no backend filter yet and is ignored.

### `GET /properties/facets` [impl]

**Live, computed by this app (facets and groups).** The backend's `POST /inventory/Listing/mobile/filter/count` returns totals only (`{ result, result_sale, result_rent }`), so the browser calls `GET /api/properties/facets` and `GET /api/properties/groups`, and the server computes them with the reference functions in `features/search/match.ts` over the city's live listings (`src/services/listing-index.ts`: every listing for a city and purpose, fetched in parallel pages of 250 and kept in memory for 10 minutes; a Mumbai sale list is ~30 MB from the backend, ~1 MB mapped). Drawer localities are the ones with listings (busiest 40 first). **Ask the backend team** for per-option counts on `/filter/count` (or a facets endpoint): it would remove this download.

Per-option counts for the filter drawer. Same params as search; `sort`, `page`, `per` are ignored.

```ts
type PropertyFacets = {
  total: number; // listings matching all the params
  facets: Record<"localities" | "unitTypes" | "bhk" | "furnishing" | "bathrooms" | "parking" | "media" | "facing" | "projects", Record<string, number>>;
};
```

Semantics (**disjunctive facets**): `facets[group][value]` = number of listings that would match if `value` were that group's **only** selection, with every other group and filter unchanged. Keys are the same option strings the filter takes (`"5+ BHK"`, `"4+"`, project ids, …). Zero counts may be omitted. The UI shows counts for the options it renders (`filterGroups` in `filter-drawer.tsx`) and reads a missing key as 0. Reference: `propertyFacets()` in `match.ts`.

### Map markers: Spatial Search API (live, called from the browser)

The `/properties` map view shows markers for the part of the map in view: clusters (count bubbles), projects (name · count) and single listings (price). It follows GeoEstate's integration (`geo_estate_new/src/services/properties.js`, `requestPolicy.js`): the browser calls `GET {NEXT_PUBLIC_SPATIAL_API_URL}/v1/locations/search-hybrid?bbox=&zoom=&radius=64&limit=5000` directly (`src/services/map-search.ts`), with no route in this app. `src/services/map-request-policy.ts` pads and grid-snaps the bounds, caches responses for 2 minutes (reused for any view inside them at the same zoom), shares identical requests, and rate-limits (8 back to back, then one per 2 s; backs off after 429). The map reports its view 400 ms after it settles; at map zoom 18 the API is asked for zoom 24; clicking a cluster or project zooms in two levels.

- The service is `https://si.rezide.in`; `NEXT_PUBLIC_SPATIAL_API_URL` overrides it for another environment.
- Map behaviour follows GeoEstate (`features/search/map-explorer.tsx`): tapping a cluster draws the circle around its H3 cell and searches only that square (`h3-js`, `map-focus.ts`); pin popups (`map-popup.ts`); a search center pin moved by tapping the map or by the browser's location; recenter, show all, a listings rail, a project's listings panel and fullscreen. Items may also carry `projectName`, `listings`, `locality`, `city`, `address`, `bedrooms`, `bhk`, `area` and `area_unit`, which are shown when sent.
- **CORS:** the service must allow this site's origin. `http://localhost:3000` is allowed today; the production domain must be added by the backend team (as `geo-estate-new.vercel.app` is).
- **To raise with the backend team:** no sale/rent or city filter (the map mixes sale and rental listings); listing items carry the short `listing_id`, which `GET /inventory/Listing/{id}` doesn't accept, so pins open a listing only when the id is a backend `_id`; the service holds no listings yet (every area returns `count: 0`), so the map shows no pins until they are loaded.

### `GET /properties/groups` [impl]

The "Location" and "Projects" result views. Same params as search plus `groupBy=locality|project` (400 otherwise); `sort`, `page`, `per` ignored.

```ts
type PropertyGroups = {
  groupBy: "locality" | "project";
  groups: { key: string /* locality name or project id */; count: number; projectCount: number; minPrice: number | null; maxPrice: number | null; image: string | null /* first photo of the latest listing */ }[];
};
```

Only non-empty groups are returned, in any order; the UI lays them over its own locality list / project list and sorts. The client sends `q=""`, and `loc=` empty in the locality view (it filters names itself). Reference: `groupProperties()` in `match.ts`.

### `GET /properties/stats` [impl]

Counts for the home-page rails. Params: `city`, `intent`, `type` (category; `category` is accepted by the mock for compatibility).

```ts
type PropertyStats = { total: number; byLocality: Record<string, number>; byUnitType: Record<string, number>; byBhk: Record<string, number> /* "1 BHK"…"5+ BHK" */; byBudget: Record<string, number>; byArea: Record<string, number> };
```

`byBudget` keys are `"{lo}-{hi}"` over the breakpoints in `BUDGET_POINTS[intent]` (`0-5000000`, `5000000-10000000`, …, inclusive both ends) plus an open band `"{last}-"` (price > last). `byArea` keys are `"{min}-{max}"` over `AREA_BANDS` (`min` inclusive, `max` exclusive, `max` empty for open-ended, e.g. `"10000-"`, `"0-500"`). Used by `/`, `/homes/rent`, `/offices`, … (`src/features/home/rails.tsx`).

### `GET /properties/:id` [impl]

```ts
type PropertyDetail = { property: Property; realtor: Realtor | null; similar: Property[] /* up to 3: same city, category, intent */; project?: Project | null; projectStock?: { sale: number; rent: number } /* live listings in that project */ };
```

404 `not_found` for unknown ids. Used by `/properties/[id]` (server prefetch + metadata, then client).

---

## 3. Catalogue: projects, realtors, firms

### `GET /projects` [impl]

Params: `city` (required), `q` (tokens over `name`, `developer`, `locality`), `status[]` (`uc|rtm|nl`), `loc[]`, `budget[]` (tier ids from `BUDGET_TIERS`: `value|mid-segment|premium|super-premium|luxury|ultra-luxury`, matched on `priceFrom`, `min` inclusive / `max` exclusive), `year[]` (possession year, int > 2000; projects without one never match), `view[]` (any of the project's `views`), `page`, `per`. OR within a group, AND across. Sort: status `nl`, `uc`, `rtm`, then `name`. Response `Paginated<Project>`. Used by `/projects/search` (including the live count for the unapplied filter dialog), the listing wizard's project picker (`per=36`) and the "Projects" view of `/properties` (`per=36`).

### `GET /projects/stats` [impl]

Params `city`, optional `status`. Response `{ total, byStatus, byLocality, byBudget /* tier id */, byYear /* "2027" … ("" when none) */ }`. Used by `/projects`, `/projects/ready-to-move`, `/projects/new-launches`.

### `GET /projects/:id` [impl]

```ts
type ProjectDetail = { project: Project; listings: Property[]; similar?: Project[] /* same city, overlapping price band, ≤6 */; nearby?: Project[] /* same city by distance, ≤6 */; developer?: { total: number; rtm: number; uc: number; nl: number; cities: string[] } };
```

404 for unknown ids. Used by `/projects/[id]`.

### Realtors and firms (live)

The directory comes from the Rezide backend (`src/services/realtors.ts`), read on this app's server through `GET /api/realtors`, `GET /api/realtors/{id}`, `GET /api/firms/{id}` and `GET /api/firms/{id}/agents/{agent}`, as rezide.in's `/api/brokers`. **Firm records hold PAN and Aadhaar numbers, bank details, mobile numbers and emails**, so `realtor-mapper.ts` copies only named public fields. Ids are the backend's `_id`s; they are used as URL slugs.

Behind them: `POST /brokers/filter/web?page=&pageSize=&status=complete` with `{ status: "complete", active_status: "active", sortBy: [1] }` → `{ data, broker_count }`; per person `POST /inventory/Listing/mobile/filter/count?broker_id=` → `{ result_sale, result_rent }`; listings `POST /inventory/Listing/mobile/all?firm_id=|broker_id=` with `{ page, pageSize, property_purpose }` (first 100 per purpose). The backend ignores city, language and specialization on the directory, and it has only a few dozen firms, so the directory is cached in memory for 10 minutes and filtered here. Someone with no stated city is listed under every city, as rezide.in lists everyone. Gender is read from the salutation. The backend has no association, rating or deal data.

The "Connect" card sends `POST https://api.rezide.in/v1/contact/form/realtor` with `{ firm_id, fname, lname, mobile, email, enquiryType: "realtor" }`.

**To raise with the backend team:** `/brokers/filter/web` is public and returns PAN and Aadhaar numbers and bank details. It should not.

The contracts below are the original proposal, and the mock still answers them.

### `GET /realtors` [impl]

Params: `city`, `by` (`name|firm`: what `q` searches), `q`, `spec[]` (any of), `loc` (one locality), `lang` and `gender` (`Female|Male`; only applied when `by=name`), `page`, `per` (default 50, max 100). Response `Paginated<Realtor>`. The finder shows the first page only (`select: page => page.items` in `realtorQueries.search`); add paging UI before a city has more than 50 realtors. Used by `/realtors` and the listing wizard's "Realtor assist" step.

### `GET /realtors/:id` [impl]

`RealtorDetail = { realtor; listings: Property[]; firm?: Firm | null; others?: { realtor; saleCount; rentCount }[] /* colleagues first, then same city, ≤8 */ }`. Used only to redirect legacy `/realtors/<realtorId>` URLs to `/realtors/<firm>/<agent>`.

### `GET /firms/:slug` [impl]

`FirmDetail = { firm: Firm; team: AgentSummary[]; listings: Property[] /* newest first */ }`. 404 unknown. Used by `/realtors/[firm]`.

### `GET /firms/:slug/agents/:agentSlug` [impl]

`RealtorDetail` for the agent whose `firmId` and `slug` match (case-insensitive). 404 unknown. Used by `/realtors/[firm]/[agent]`.

**Note (listings embedded in details).** Firm, agent and project details embed **all** their listings; the UI splits Sale/Rental and pages them client-side (`paginateListings`, 9 per page, `?intent=rent&page=2`). Fine for the sample sizes; for large firms add `GET /firms/:slug/listings?intent=&page=&per=` → `Paginated<Property> & { saleCount, rentCount }` **[proposed]** and drop `listings` from the detail.

---

## 4. Auth (OTP)

**Live: the Rezide backend, never mocked** (`src/services/auth.ts`, the same flow and endpoints as the rezide.in web app). The browser calls `/v1/admin/*`, which `next.config.ts` proxies to `https://api.rezide.in/v1/admin/*`. Numbers are sent as `91` + 10 digits; codes are 4 digits (`OTP_LENGTH`). The purpose passed to `useOtpFlow` picks the endpoints:

| Purpose (`useOtpFlow` option) | Used by | Send OTP | Verify OTP |
| --- | --- | --- | --- |
| `signin` (default) | `/login`, List Property gate, Realtor Corner sign-in and checkout | `GET /user/user/login/otp/mobile/{phone}?role=customer\|broker` | `GET /user/user/login/user/{otp}?phone={phone}` → user `{ id, firstname, lastname, phone, email }` |
| `signup` | `/signup` (customers; realtor sign-up is refused with a message) | `GET /user/user/send/sms/otp/{phone}` | `GET /user/user/verify/sms/{otp}?phone={phone}`, then `POST /user/user/add/customer { phone, firstname, lastname, email }` |
| `verify` | Realtor Corner trial dialog (number check only; the session is discarded) | `GET /user/user/send/sms/otp/{phone}` | `GET /user/user/verify/sms/{otp}?phone={phone}` |

Sign out also calls `POST /user/user/logout`. The verified user is mapped to `Session = { user: User; expiresAt }` with `User = { id, role, firstName, lastName, phone, email?, firm? }` and kept for 12 h in `localStorage` (`src/stores/session.ts`). Errors come back as `{ error }` or `{ message }` (wrong code: `400 { "error": "Invalid OTP" }`), shown under the code field; a 401 from these endpoints is a form error, not an expired session.

**To confirm with the backend team:** the realtor login role (`broker` is assumed; rezide.in only signs customers in) and what `add/customer` returns (without an id the user is asked to sign in, as rezide.in does).

### What the backend should add

The backend issues no token or cookie today, so the session is client-side only and the account and dashboard guards are conveniences, not security.

- Set an **httpOnly, Secure, SameSite=Lax** session cookie (or return a token) when the OTP is verified.
- Add **[proposed]** `GET /user/user/me`-style session checks that answer 401 when signed out.
- Enforce authorisation server-side on `/account/*`, `/dashboard/*` (realtor role, firm scope) and `POST /listings`.
- Customer role switching (seeker/owner) is a UI view toggle today; the server should treat a customer as both.

Frontend seams already in place (`src/lib/api/client.ts`, `src/app/providers.tsx`):

| Seam | Default | Turn on |
| --- | --- | --- |
| Cookies on cross-origin requests | `withCredentials: false` | `NEXT_PUBLIC_API_WITH_CREDENTIALS=true` (API must send `Access-Control-Allow-Credentials: true` and an explicit origin) |
| Bearer token | none | `configureAuth({ getAccessToken })` in `AuthBridge` (`providers.tsx`) |
| 401 handling | signs out, clears `account`/`dashboard` queries, `router.replace("/login?next=…")` | already wired; fires for any 401 except the OTP endpoints |
| Forwarding the user's cookie on server prefetches | none | `configureAuth({ getServerHeaders })` reading `headers()` from `next/headers` (server-only module) |

---

## 5. Enquiries and leads

### Listing enquiries (live)

The property detail page's contact form, Make an offer and Request visit send to the listing's broker, as rezide.in does: `POST https://api.rezide.in/v1/contact/form` from the browser (`sendListingEnquiry` in `src/services/mutations.ts`), body `{ name, firm_id, phone: "+91…", brokerId, listing_id, enquiryType, notes? }`, answering `{ message }`. `brokerId` and `firm_id` come from the listing's `broker_and_agent`, and `enquiryType` holds rezide.in's wording (`toListingEnquiry` in `lead-form.tsx`). Offer and visit need a signed-in user; the contact form doesn't. rezide.in's offer button sends no amount, so the amount this form asks for goes in `notes`.

**Not live:** project leads (`POST /lead/developer-contact`) and realtor profile leads (`POST https://api.rezide.in/v1/contact/form/realtor`) wait for the Projects and Realtors modules, which still use sample ids. The Realtor Corner callback and trial forms have no endpoint on rezide.in.

### `POST /enquiries` [impl]

Body `EnquiryInput = { propertyId?, projectId?, realtorId?, name, phone, email?, message?, channel: "callback" | "whatsapp" | "visit", preferredDate? /* YYYY-MM-DD, required when channel = visit, not in the past */ }`. Exactly one target id is expected. Validation (UI, mirror it server-side): `name` 1–60 (lead forms send `"First Last"`), `phone` 10-digit Indian mobile, `email` valid or empty (≤120), `message` ≤500. Response `201 Enquiry = EnquiryInput & { id, createdAt, status: "received" }`. 422 with `fieldErrors` keyed `name`, `phone`, `channel`, `preferredDate`, `email`, `message`.

Used by: project enquiry, realtor "Connect with me" card, generic enquiry form.

**Gaps for the backend:** an *offer* is sent as `channel: "callback"` with `message: "Offer: ₹ 7,40,00,000. …"`, and the visit *time slot* is not structured. Recommended **[proposed]** `POST /offers { propertyId, amount }` and `POST /visits { propertyId, date, slot }`, feeding `/account/offers` and `/account/visits`. Lead routing (SMS/WhatsApp/email to the realtor) is the backend's job; the UI tells users nothing is sent while mocking.

---

## 6. Listings (List Property)

### List Property submit (live, as a lead)

The wizard sends a lead to the Rezide team, as rezide.in's List Property form does: `POST /lead/developer-contact` (`submitListing` in `src/services/mutations.ts`) with `{ type: "listProperty", fullName, mobile, email, locality, projectName, flatNo, lookingFor: "List property for sale|rent", source: "Rezide.in property listing form" }`. The wizard's other main answers are added (`role`, `ownerName`, `ownerMobile`, `city`, `region`, `subRegion`, `address`, `pincode`, `category`, `unitType`, `tower`, `floor`, `price`); rezide.in's form doesn't send them, so **ask the backend team** whether they are kept. No listing is created or published. Unit details, features, photos, video, furniture and the chosen realtors aren't sent.

**The contract below is proposed**, for when the backend can accept a whole listing.

### `POST /listings` [proposed] (auth required)

Body: the whole `ListingDraft` (`src/types/models.ts`); all values are strings/arrays as typed in the wizard. Required: `category` (`home|office|industrial|retail|land`), `unitType` (per `CATEGORY_UNITS` in `src/features/listing/schema.ts`), `intent` (`sell|rent`), `price` (digits, ≥ 1000, INR; monthly for rent). Step rules the server should mirror (`schema.ts`): `role` + `city`; non-owners need `ownerName`; `address` ≤ 250 and `locality`; non-land needs `unitNo`, `projectStatus`, `buildingType`, numeric `floor ≤ totalFloors`; `pincode` 6 digits if given; `assist=yes` needs 1–3 `realtorIds` and `handover`; full flow needs `area` (number), `areaType` (or `plotType` for land), homes need `configuration`, `bathrooms`, `furnishing`; `highlights` ≤ 500.

Response `201 { id, status: "pending_verification" | "with_realtor" }` (`with_realtor` when `handover = realtor`). 422 with `fieldErrors` per missing field.

**Not connected:** media upload (`photoNames` carries file names only, `videoUrl` is a link), POA/ownership documents, verification workflow. Needs an upload endpoint (pre-signed URLs) **[proposed]**.

---

## 7. Customer account (auth required)

All scoped to the signed-in user; no user id in the URL, except the live activity endpoints below.

**Live activity** (`src/services/activity.ts`, the same backend endpoints as rezide.in). `GET /api/account/activity` is this app's route: rows hold full listing records, so they are mapped on the server and a withheld price never reaches the browser. Behind it: `GET /user/statistic/last/visit/{userId}?page=&pageSize=` → `{ result: { visits: [{ listing_id, listing, timestamp }] } }`; `GET /shortlist/user/statistic/{userId}?page=&pageSize=` → `{ result: { shortlist: [...] } }`; `GET /share/listing/user/shared?mobile_no=91…&status=reject` → `{ data: [{ listing_id: { _id }, createdAt }] }`, with each listing then read from `GET /inventory/Listing/{id}`. The browser calls directly (no listing records): `GET /shortlist/user/statistic/{userId}` (ids for the button), `POST /shortlist/user/statistic/{userId}?listing_id=&action=add|remove&type=sale|rent`, and `POST /user/statistic/last/visit/{userId}?listing_id=&type=sale|rent` when a signed-in user opens a listing. Guests, Compare and project shortlists stay on the device (`src/stores/saved.ts`); rezide.in's compare is also device-only.

**To raise with the backend team:** these endpoints take a user id or phone with no token, so anyone who has one can read or change that user's activity (rezide.in has the same gap).

| Endpoint | Params | Response | Screen |
| --- | --- | --- | --- |
| `GET /api/account/activity` **live** | `tab=viewed\|shared\|shortlisted\|rejected`, `userId`, `phone` | `ActivityItem[] = { propertyId, date, note?, property: Property }[]` (latest 50, properties only) | `/account` seeker lists |
| `GET /account/visits` [impl] | `role=seeker\|owner` | `AccountVisit[]` | `/account?tab=visits` |
| `GET /account/offers` [impl] | `role=seeker\|owner` | `AccountOffer[]` | `/account?tab=offers` |
| `GET /account/listings` [impl] | — | `OwnerListing[]` | `/account?tab=listings` (owner) |

```ts
type AccountVisit = { id; propertyId?; intent: "buy" | "rent"; listingTitle; locality; kind: "site_visit" | "video_tour"; date /* YYYY-MM-DD */; time? /* HH:mm IST */; status: "requested" | "confirmed" | "completed" | "cancelled"; counterpart /* seeker: realtor/firm; owner: buyer */; via? /* realtor bringing the buyer */ };
type AccountOffer = { id; propertyId?; intent; listingTitle; date; amount /* INR */; askingPrice?; status: "submitted" | "under_review" | "countered" | "accepted" | "declined"; counterpart? /* owner view: who offered */; via? };
type OwnerListing = { id; propertyId?; title; locality; city; category; intent; price /* INR */; status: "live" | "under_review" | "draft"; stats: { views; shortlists; visits; offers } | null /* null until live */; listedAt?; submittedAt?; assistedBy?; pendingNote?; image };
```

Order: newest first. The owner summary tiles are sums over `stats`. Listing actions (Edit / Delist / Delete) are disabled in the UI: **[proposed]** `PATCH /account/listings/:id`, `DELETE /account/listings/:id`.

---

## 8. Realtor Corner

### `POST /callbacks` [impl]

Body `CallbackInput = { firstName /* 1–60 */, lastName? /* ≤60 */, mobile, email?, firm? /* ≤80 */, message? /* ≤500 */ }`. `201 { id, status: "received" }`. 422 `fieldErrors` keyed `firstName`, `mobile`, …

### `POST /trial-requests` [impl]

Body `TrialRequestInput = { mobile /* OTP-verified in the same dialog */, firstName, lastName, firm /* ≥2 */, reraId /* 8–20 [A-Z0-9/-] */, city, membership: "nar" | "other", associations: string[] }`. `201 { id, status: "pending_review" }`. 422 `fieldErrors` keyed `mobile`, `firstName`, `firm`, `reraId`, `membership`. The server should require proof that `mobile` was verified (a session or short-lived token from the OTP check), not trust the body.

Checkout is **disabled** (order summary only, computed client-side in `src/features/corner/pricing.ts`). Plans, prices, add-ons, credit packs and GST rate are hard-coded there; a backend-owned **[proposed]** `GET /plans` and an order/payment API are needed before payments go live.

---

## 9. Realtor CRM: `/dashboard/*` (auth: realtor; scoped to the realtor's firm)

Types in `src/types/dashboard.ts`; service `src/services/dashboard.ts`; hooks `src/features/dashboard/api.ts` (every write invalidates all `["dashboard", …]` queries and shows failures as a toast). The mock keeps writes in memory until reload.

| Method & path | Body / params | Response | Errors |
| --- | --- | --- | --- |
| `GET /dashboard/contacts` | — | `Contact[]` | |
| `GET /dashboard/contacts/:id` | — | `Contact` | 404 |
| `POST /dashboard/contacts` | `ContactInput` (`firstName`, `mobile` required) | `201 Contact` (server sets `id`, `addedOn`, `addedBy`; defaults `type: Customer`, `entity: Individual`, `salutation: Mr.`, empty arrays) | 422 |
| `PATCH /dashboard/contacts/:id` | `ContactPatch` (merge; arrays replace) | `Contact` | 404, 422 |
| `DELETE /dashboard/contacts/:id` | — | `204` | 404 |
| `GET /dashboard/groups` | — | `GroupWithCount[]` (`count` = contacts in the group) | |
| `POST /dashboard/groups` | `GroupInput { name (required), description?, contactIds? }` | `201 ContactGroup` | 422 |
| `PATCH /dashboard/groups/:id` | `GroupInput`; `contactIds` present → **replaces** membership | `ContactGroup` | 404, 422 |
| `DELETE /dashboard/groups/:id` | — | `204`; removes the id from every contact's `groupIds` | 404 |
| `GET /dashboard/uploads` | — | `UploadFile[]` | |
| `GET /dashboard/uploads/:id` | — | `UploadDetail { file, records: { name, mobile, contactId?, contactType? }[] }` (records matched to contacts by last 10 mobile digits, live) | 404 |
| `GET /dashboard/credits` | — | `CreditsData { balance, monthlyGrant, renewsOn, statementDate, entries: CreditEntry[] }` (entries newest first; `amount` ± credits, `balance` after) | |
| `GET /dashboard/team` | — | `TeamData { members, teams, seatsTotal, renewsOn }` | |
| `PATCH /dashboard/team` | `TeamPatch { members?, teams? }` (each list replaces) | `TeamData` | 409 `seats_full` if members > seats |
| `POST /dashboard/team/members` | `{ name (required), role?: "manager" \| "agent", teamIds?, areas?, email?, phone?, reportsTo? }` | `201 TeamMember` | 409 `seats_full`, 422 |
| `GET /dashboard/firm` / `PUT /dashboard/firm` | `Partial<FirmProfile>` (merge) | `FirmProfile` | 422 (`name` empty) |
| `GET /dashboard/me` / `PUT /dashboard/me` | `Partial<MyProfile>` (merge) | `MyProfile` | 422 (`firstName`, `mobile`) |
| `GET /dashboard/associable-projects` | `propertyType=Residential\|Commercial\|Land`, `unitType`, `q?` (substring over name, locality, developer) | `AssociableProject[]` | |
| `GET /dashboard/associable-projects/:id/units` | `tower` (one of the project's `towers`) | `string[]` unit numbers | 404, 422 `fieldErrors.tower` |

Validation (mirror `contact-form.tsx` and the mock): contact `firstName` required, `mobile` valid 10-digit, `company` required when `type = Developer` or `entity = Company`, ≤ 4 `labels`, optional emails valid; group `name` required; member `name` required. 422s carry `fieldErrors` keyed by body field.

Notes for the backend:

- Contacts list is returned whole; filtering, sorting, column choice, pagination and CSV export happen client-side (`contact-model.ts`, `store.ts`). For firms with thousands of contacts, add `Paginated<Contact>` with `type`, `group`, `label`, `q`, `sort` params **[proposed]**, and server-side CSV export (it costs credits per the credits ledger).
- Upload *files* are not sent anywhere: the database page records the file name only. Needs a CSV/XLSX import endpoint **[proposed]**.
- `addedBy` is the member's display name; `MyProfile.aadhaar` must be masked by the server.
- Unavailable sections (Leads, Listing, Inventory, Marketing, Customisation, WhatsApp Templates, Integration, Subscription, Upload History) have no endpoints yet.

---

## Home page rails (live)

The Properties and Projects home rails (`src/features/home/rails.tsx`) load through `src/services/home.ts` from the same endpoints as rezide.in's `homeSlice`: `GET /inventory/project/home-page/locality`, `/budget`, `/possession?status=Under Construction`, and `GET /inventory/listing/home-page?property=sale|rent&subType=byBudget|byType|byBhk`. Counts are worded by the backend ("326+ listings") and shown as they come.

**To raise with the backend team:** these endpoints ignore `location` (Pune returns the same numbers as Mumbai) and the popular localities are all in Mumbai with no city field, so the counts are not per city and can be higher than a card's search results (e.g. 3 BHK shows 326+, Mumbai search has 304). Some popular-locality names match no search ("N M Joshi Marg Police Station"). `/developers` isn't used: the new UI has no developers section.

## 10. Reference data owned by the frontend today

Static in `src/lib/constants.ts` and a few feature files. Fine as product config; the ones marked **backend** should become API data before scale:

| Data | Where | Owner |
| --- | --- | --- |
| Categories, intents, sort keys, page sizes, BHK/bath/parking/furnishing/facing/media options, budget breakpoints, area bands, project status codes, budget tiers, OTP length | `constants.ts`, `criteria.ts` | Frontend (keep in sync with the API's accepted values) |
| Cities (`TOP_CITIES`, `OTHER_CITIES`, `CITY_CENTRES`) | `constants.ts` | **Live in the city picker**: the list and search come from `GET /master/city/search?page=1&pageSize=5000` (`src/services/locations.ts`, ranked by `features/location/city-search.ts`); `TOP_CITIES` stays as the curated grid and the static lists are the fallback while it loads. The master's "Bangalore" is shown as Bengaluru (`cityLabel` / `toBackendCity`). |
| Region → sub-region → locality (List Property location picker) | — | **Live** (`src/services/locations.ts`, `features/listing/use-location-options.ts`), as rezide.in's search bar: `GET /master/region?city={cityId}` → `{ data: [{ _id, name }] }`, `POST /repository/sub_region/regions` with `{ regions: [id] }` → `[{ _id, name }]`, `POST /repository/locality/sub-regions` with `{ subRegions: [id] }` → `[{ _id, general_information: { locality_name } }]`. The city's id comes from `GET /master/city/search`. Each level loads when the one above is chosen; the draft keeps names. Some cities have no regions yet (Noida, Kolkata), so the locality can always be typed. |
| Search suggestions | — | **Live** in the hero searches: `GET /repository/locality/search/list/{text}[/broker\|/developer]?city=` → `{ result: [{ _id, name, source, city }] }` (`fetchSearchSuggestions`); property search leaves realtors out. Picking one searches for its name. |
| Landmarks and locality photo (listing detail, Locality tab) | — | **Live** (`src/services/localities.ts`), as rezide.in's locality card: `GET /repository/locality/landmark/{projectId}?category=school\|train_station\|subway_station\|airport\|mall\|hospital&pageSize=4` → `{ landmarkCount, data: [{ placeName, latitude, longitude, distance }] }`, and `POST /Repository/Locality/filter?page=&pageSize=` with `{ sub_regions, regions, searchQuery: [name] }` → `{ result_count, data: [{ general_information, media: { images: [{ url }] } }] }`. Landmarks belong to projects, so a listing without one shows none. The search takes the locality name, not the sub-region ("Tunga Village" matches, "Powai" doesn't); without an exact match the stock photo stays. The new UI has no locality list or detail page, so `GET /Repository/Locality` and `GET /Repository/Locality/:id` (description, what to expect, lifestyle, market) aren't used yet. |
| Localities per city (`LOCALITIES`) — drives filter options, locality cards, rails | `constants.ts` | **Backend**: `GET /cities/:city/localities` **[proposed]**; the facets/groups/stats endpoints already return counts by locality |
| Region → locality groups in the project search dialog | `LOCALITY_REGIONS` in `project-search.tsx` | **Backend** (with the Projects module) |
| Unit types per category (search) vs per listing category (wizard, different names) vs CRM (`CRM_UNIT_TYPES`) | `constants.ts`, `listing/schema.ts` | **Backend**: one taxonomy; the three lists disagree today (`Grade A office` vs `Office Space`) |
| Realtor specializations, languages; CRM specializations/languages/coverage | `constants.ts`, `dashboard/profiles.tsx` | Backend (two lists today) |
| Realtor sign-up cities, associations; listing cities | `auth-card.tsx`, `listing/schema.ts` | Backend |
| Ai-R plans, prices, add-ons, credit packs, GST | `corner/pricing.ts` | **Backend** (billing) |
| Price analysis ranges ("similar units") | `listing/price-analysis.tsx` (`SAMPLE`) | **Backend** (registered-transaction data) |
| Sample photography, hero images | `src/content/media.ts` | Frontend/CMS |

---

## 11. Server-side fetching (Next.js 16, Cache Components)

Detail pages (`/properties/[id]`, `/projects/[id]`, `/realtors/[firm]`, `/realtors/[firm]/[agent]`) fetch on the server through the **same Axios client**: `generateMetadata` calls the service directly and the page prefetches the query into TanStack Query (`HydrationBoundary`), inside `<Suspense>` after `await connection()` (request-time rendering). With mocking on, the mock adapter answers in-process.

What changes against a real API:

1. **Absolute base URL on the server.** Set `API_SERVER_BASE_URL` (e.g. `http://api.internal:8080`) when `NEXT_PUBLIC_API_BASE_URL` is relative. Implemented in `client.ts`.
2. **Two requests per page view.** Metadata and the page each call the detail endpoint (Axios is not deduped like `fetch`). Wrap a server-only getter in React `cache()` and seed the query with `queryClient.setQueryData`, or cache it as below.
3. **Caching catalogue reads.** Public catalogue responses (property/project/firm detail, stats) are good candidates for `"use cache"` + `cacheLife("minutes" | "hours")` + `cacheTag("property:<id>")` in a server-only data module, with the backend (or an admin action) calling `revalidateTag` on edits. `cacheLife` profiles: `seconds`, `minutes` (revalidate 1 min, expire 1 h), `hours`, `days`, `weeks`, `max`. Constraints from `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`: a cached function cannot read `cookies()`/`headers()` (read them outside and pass values in), its arguments and return value must be serialisable, and the `await connection()` call must stay outside it. TanStack's dehydrate reads the clock, which is why the pages call `connection()` today; keep the cached function to "fetch data" only.
4. **Never cache per-user data in `use cache`.** Anything fetched with forwarded cookies (`getServerHeaders`) is user-specific: leave it uncached, or use `"use cache: private"` (per-request, not shared across users).
5. **Cookies on the server.** Today no server request needs auth. If account/dashboard pages ever prefetch on the server, forward the incoming `cookie` header via `configureAuth({ getServerHeaders })` (request-scoped `headers()`, never a module variable).
6. **404 status.** Unknown ids render the not-found UI but the HTTP status stays 200 because content streams after the shell (known limitation in the README).

---

## Integration checklist

1. **Env vars** (`.env.example`):
   - `NEXT_PUBLIC_API_BASE_URL` — public API base (or `/api` behind a Next rewrite / reverse proxy).
   - `API_SERVER_BASE_URL` — absolute base for server-side requests (server-only).
   - `NEXT_PUBLIC_API_MOCKING` — `on` (default), `off`, or a comma list of mocked domains, e.g. `dashboard,account` to keep those mocked while the rest hit the backend. Domains: `properties, projects, realtors, firms, enquiries, listings, account, callbacks, trial-requests, dashboard` (first path segment; auth is never mocked). Note `firms` and `realtors` serve one screen family, and the property detail embeds realtors/projects, so switch related domains together.
   - `NEXT_PUBLIC_API_WITH_CREDENTIALS=true` — send cookies cross-origin.
   - `NEXT_PUBLIC_MOCK_DELAY_MS` — mock latency.
   - `NEXT_PUBLIC_*` values are inlined at build time: rebuild after changing them.
2. **CORS/cookies**: same-origin `/api` (rewrite or proxy) avoids CORS entirely and is the simplest for httpOnly cookies. Cross-origin needs `Access-Control-Allow-Origin: <site origin>`, `Access-Control-Allow-Credentials: true`, `SameSite=None; Secure` cookies, and preflight support for `PATCH`/`PUT`/`DELETE` with `Content-Type: application/json`.
3. **Images**: listing, project and realtor images are rendered with `next/image`; add the media CDN host to `images.remotePatterns` in `next.config.ts` (only `images.unsplash.com` today) and allow it in any CSP.
4. **Auth**: live (§4). Still to do: replace the localStorage session with a backend session (cookie or token) once the backend issues one, and add server-side route protection (`proxy.ts` in Next 16, formerly middleware) for `/account` and `/dashboard`.
5. **"Demo mode" copy**: success messages and badges read `API_MOCKING` (true when any domain is mocked). Review the copy per domain when going partially live.
6. **Front-end only, by design (no API needed yet)**: Shortlist and Compare (`src/stores/saved.ts`, localStorage, this device only), preferred city, the listing wizard draft (`src/stores/listing-draft.ts`), CRM table preferences. If shortlists must sync across devices, add `/account/shortlist` **[proposed]** and merge the local list on sign-in. Note `/account?tab=shortlisted` (server) and the Shortlist button on detail pages (device, `save-actions.tsx`) are separate lists today.
7. **Not connected anywhere**: payments/checkout, brochures, RERA lookups, registered-transaction records, valuation reports, media/document uploads, messaging (SMS/WhatsApp/email), maps beyond OpenStreetMap tiles.
8. **Verify**: run `npm test` with mocking on (contract tests), then point a dev build at the backend with `NEXT_PUBLIC_API_MOCKING=off` and walk the README journeys.

## Endpoint index

| Domain | Endpoints | Count |
| --- | --- | --- |
| Properties | `GET /properties`, `/properties/facets`, `/properties/groups`, `/properties/stats`, `/properties/:id` | 5 |
| Projects | `GET /projects`, `/projects/stats`, `/projects/:id` | 3 |
| Realtors & firms | `GET /realtors`, `/realtors/:id`, `/firms/:slug`, `/firms/:slug/agents/:agentSlug` | 4 |
| Enquiries | `POST /enquiries` | 1 |
| Auth (live, `/user/user/*`) | login OTP, SMS OTP, `add/customer`, `logout` | 6 |
| Listings | `POST /listings` | 1 |
| Account | `GET /account/activity`, `/account/visits`, `/account/offers`, `/account/listings` | 4 |
| Realtor Corner | `POST /callbacks`, `/trial-requests` | 2 |
| Dashboard (CRM) | contacts ×5, groups ×4, uploads ×2, credits ×1, team ×3, firm ×2, me ×2, associable projects ×2 | 21 |
| **Total implemented** | | **43** |
