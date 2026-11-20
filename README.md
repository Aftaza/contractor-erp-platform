# Contractor ERP Platform

An internal ERP and a public company profile for a mechanical, civil and electrical contractor, built during my
internship (PKL) as a Computer Engineering student at Universitas Brawijaya.

> **Anonymized public version.** The company ("PT Acme Konstruksi"), its clients, people, addresses, contacts and
> project list are fictional, and client documents are left out. The code, schema, tests and deployment setup are
> the real ones.

## What it does

The company ran project finance in separate Excel files. The ERP replaces them:

- **RAB as milestones.** A project's budget (RAB) is one tree, section → subgroup → phase → item, imported from the
  company's `.xlsx` format (around 250 nodes per project). Once approved it is locked and becomes the milestone
  list, so progress is weighted by value.
- **Money in and out.** Purchases are recorded against RAB items, so actual cost lines up with the budget. Client
  payments follow termins (progress-based invoices).
- **Tools and warehouse.** Equipment, hand-over and return, done from a phone with weak signal.
- **Three roles.** `pimpinan` (directors, mostly on a phone: status and finance of every project in under a minute),
  `admin` (project and finance staff), `staff_gudang` (warehouse). Changes are written to an audit log.
- **Publishing.** Finished projects can be published to the company profile site; the public endpoint returns a
  fixed set of fields and never the client's name.

## Repository

| Path | Stack | Purpose |
| --- | --- | --- |
| [`apps/api`](apps/api) | NestJS, Prisma, PostgreSQL, argon2, JWT | REST API (`/api/v1`), OpenAPI contract, RAB import, audit, uploads |
| [`apps/erp`](apps/erp) | SvelteKit (static SPA), Tailwind CSS | The ERP used by staff |
| [`apps/web`](apps/web) | Astro 7, React islands, Tailwind CSS | Static company profile; pulls published projects from the API at build time |
| [`packages/api-types`](packages/api-types) | TypeScript | Types generated from `apps/api/openapi.json`, shared with the ERP |
| [`deploy`](deploy) | Docker Compose, Caddy, Cloudflare Tunnel | Single-VPS production and staging stacks, Postgres roles, backup and restore |

## Quality gates

CI (`.github/workflows/ci.yml`) runs per app, filtered by changed paths:

- **API:** lint, type-check build, unit tests, e2e tests, an OpenAPI contract check, migrations against a real
  Postgres service, DB integration tests, a schema drift check (Prisma migrations vs. schema), and a check that
  `openapi.json` and `packages/api-types` are in sync.
- **ERP:** lint, `svelte-check`, Vitest, Playwright e2e.
- **Web:** `astro check`, unit tests, build.
- **Dependencies:** `npm audit` on production dependencies, failing on high severity.

## Running locally

Needs Node 22.23+ and Docker.

```bash
npm ci
cp .env.example .env            # fill in the secrets
docker compose up -d db         # Postgres
npm run dev:api                 # http://localhost:3001
npm run dev:erp
npm run dev:web                 # http://localhost:4321
```

The API seeds the first `pimpinan` account from `SEED_PIMPINAN_EMAIL` and `SEED_PIMPINAN_PASSWORD`
and that account must change its password on first login. Deployment to a VPS, including the seed step, is in
[`deploy/README.md`](deploy/README.md).
