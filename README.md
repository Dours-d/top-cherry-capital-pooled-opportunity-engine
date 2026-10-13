# Top Cherry Capital — Pooled Opportunity Engine

A mobile-first tool for comparing secondhand marketplace opportunities and allocating a pooled budget across quantities. Top Cherry combines a visible listing layer, an observed market-behavior layer, and a network/novelty prototype. It is an Expo/React Native app with a Node/Express/tRPC backend and MySQL/Drizzle persistence.

## What works, and what is still pending

Discover has marketplace-independent categories, source/country/pickup-distance filters, and clearly labelled sample listings. Plan produces budget-sensitive quantity mixes and estimates net upside after configurable fees and travel costs. Saves and preferences support signed-in persistence.

The eBay callback supports challenge verification, signature validation, idempotent storage, and redaction of account-deletion identifiers. Workspace displays database-backed delivery counts, current subscription status, and observed listing-signal aggregates. Missing or failed data is shown as unknown, not as a fabricated live count.

**Live listing access is not enabled.** On 13 October 2026, eBay rejected the current application's `buy.item.stream` scope with HTTP 400 / `invalid_scope`. `ITEM_AVAILABILITY` and `ITEM_PRICE_REVISION` require that authorization; a developer account and a working account-deletion webhook do not grant it. No listing subscription was created during that failed access check. The signal pipeline is ready for verified observations but must not be confused with a live marketplace-wide feed. Network/novelty values remain prototype signals.

## Clone and set up

Sign in to GitHub as **Dours-d**, or as a collaborator with access to this private repository. GitHub can return 404 to accounts or app tokens that lack private-repository permission even when SSH access works.

```bash
gh repo clone Dours-d/top-cherry-capital-pooled-opportunity-engine
cd top-cherry-capital-pooled-opportunity-engine
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm setup
```

Requirements: Node.js 22+, pnpm 9.12.0. `pnpm setup` installs the lockfile dependencies, runs TypeScript, deterministic tests, and the backend build, then reports configuration presence. It does not create accounts, request API permissions, apply migrations, or deploy anything. CI and deterministic tests need no production credentials.

For a sample-only browser UI:

```bash
pnpm dev:metro
```

Expo serves the browser preview on local port 8081. Once backend configuration is supplied, `pnpm dev` starts the API on port 3000 as well as Metro. Use Expo Go with `pnpm qr` for native-device development; this requires a reachable Metro host.

## Server configuration

Use the hosting platform's secret manager or exported process environment. In Manus, use the project's secure Secrets interface. Never commit credentials or private keys.

- `DATABASE_URL`: MySQL connection string for saves, preferences, and notification storage.
- `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`: configured Manus auth values, not invented defaults.
- `EXPO_PUBLIC_APP_ID`, `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_OAUTH_PORTAL_URL`: corresponding public client settings. Anything prefixed `EXPO_PUBLIC_` is bundled into the mobile client; never put secrets there.
- `EBAY_APP_ID`, `EBAY_CLIENT_SECRET`: production eBay application credentials, server-only.
- `EBAY_NOTIFICATION_ENDPOINT`: the exact registered HTTPS callback URL.
- The current callback prioritizes `EBAY_DEV_ID` as its verification token and falls back to `EBAY_NOTIFICATION_VERIFICATION_TOKEN`. The active value must match eBay exactly. This documents existing behavior; do not independently rotate either side. Moving to a dedicated random token requires a coordinated server/eBay update.

```bash
pnpm setup:check           # presence only; never prints secret values
pnpm setup:check --strict  # fail when full backend configuration is missing
pnpm ebay:access          # read-only item-stream authorization probe
pnpm test:live            # opt-in HTTPS challenge hash check
```

`pnpm test:live` verifies the exact configured hash. It does not send a notification or prove a POST delivery succeeded. Run `pnpm ebay:access` after eBay grants the item-stream scope; do not keep retrying a denied scope.

## Database migrations

The repository includes migration history under `drizzle/`. Review SQL and back up the target before applying migrations. An existing database must have migration history reconciled if earlier migrations were applied manually; blindly rerunning them can conflict with existing tables.

```bash
pnpm drizzle-kit generate  # after an intentional schema edit
pnpm drizzle-kit migrate   # apply reviewed pending migrations to the chosen database
```

In managed WebDev, follow the reviewed migration process for that environment. A GitHub push does not migrate its database.

## Tests and build

```bash
pnpm validate     # TypeScript + deterministic tests + backend bundle
pnpm test         # no live eBay network dependency
pnpm test:live    # configured live callback only; separate from CI
pnpm build
pnpm start        # runs dist/index.js with the configured production environment
```

GitHub Actions runs `Top Cherry validation` on pushes to `main`, pull requests, and manual workflow dispatch. It has read-only repository permissions and does not receive production secrets or deploy the app.

## Deployment is separate from GitHub

**This private repository stores source code; it is not a public website.** GitHub Pages is not configured and cannot host the Node webhook. CI validates code; it does not automatically publish Manus or distribute mobile releases.

The currently registered webhook is:

```text
https://topcherry-irjqaq92.manus.space/api/ebay/notifications
```

The root of that backend domain may return 404 because it has no mobile UI route. `GET /api/ebay/notifications` requires `challenge_code`; signed `POST` deliveries are validated and stored. Do not use the root URL as the app preview. The sandbox Expo preview is temporary; a successful checkpoint is not evidence of a production UI deployment. Native store builds and a persistent browser UI are separate release tasks.

After an iteration: run validation, save the WebDev checkpoint, push the same commit to GitHub, and verify the remote SHA. Neither a local edit nor a saved checkpoint automatically synchronizes this GitHub repository.

## Repository map

`app/(tabs)/` contains Discover, Plan, Saved, and Workspace. `lib/market-data.ts` holds the explicitly labelled sample dataset and capital-planning model. `shared/ebay-signals.ts` derives currency-safe price movements and availability signals from observations, without treating an unavailable item as a proven sale. `server/ebay-notifications.ts` handles the callback. `server/ebay-monitoring.ts` reads subscription status without exposing credentials. `server/db.ts`, `drizzle/`, and `tests/` contain persistence, migrations, and regression coverage.

See [the project tracker](todo.md) and [eBay topic rollout](docs/ebay-topic-rollout.md) for remaining work and API references.
