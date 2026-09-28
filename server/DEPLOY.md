# Deploying the standalone API

The API (this `server/` folder) and the Postgres database run together on
the BigRock VPS, in Docker, at `/home/atharv/disha-mvp/`. The Next.js
frontend deploys separately, on Vercel. This is deliberate: it lets the
database stay off the public internet entirely (the API reaches it over
Docker's internal network, `db:5432`), rather than needing to be reachable
from Vercel's serverless functions, which have no fixed IP to lock it down to.

## Layout on the VPS

```
/home/atharv/disha-mvp/
  docker-compose.yml   # defines the `db` and `api` services
  api.env              # the api service's env vars (DATABASE_URL, OTP secrets, etc.) - not in git
  certs/               # self-signed TLS cert Postgres uses internally
  config/pg_hba.conf   # Postgres access rules (SSL required, even internally)
  logs/                # Postgres's own connection logs (fail2ban watches these)
  app-src/              # a plain git clone of this repo (dev branch) - source for the api image
```

`docker-compose.yml` and `api.env` are **not** committed to this repo — they
live only on the VPS, since `api.env` carries real secrets. Ask whoever set
this up (or check the VPS directly) if you need to see/change them.

## Redeploying after a code change

```bash
ssh atharv@66.116.254.171
cd /home/atharv/disha-mvp/app-src
git pull origin dev        # or main, once merged
cd ..
docker compose up -d --build
```

That rebuilds only the `api` image (Postgres is untouched) and restarts it
with zero manual steps beyond those four commands.

## How it's reached from the internet

Nginx (already running on this VPS for the other projects hosted on it too)
reverse-proxies `https://api.mylifecoach.in` → `127.0.0.1:4000` (where the
`api` container is bound — not on any public interface directly). SSL is a
real Let's Encrypt certificate via Certbot, matching the same pattern as
this VPS's other projects.

## Environment variables the API needs (`api.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Points at `db:5432` (Docker's internal network), not the old public port |
| `OTP_PROVIDER` | `stub` until SMSGW's DLT approval clears, then `smsgw` |
| `OTP_HASH_SECRET` | Pepper for hashed OTP codes - production-only value, never the local dev one |
| `SMSGW_*` | Only needed once `OTP_PROVIDER=smsgw` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins (CORS). Any `https://*.vercel.app` preview URL is allowed automatically - see `server/index.ts` |
| `PORT` | `4000` |

## The frontend side (Vercel)

The Next.js app needs `NEXT_PUBLIC_API_BASE_URL=https://api.mylifecoach.in`
set in Vercel's project environment variables (Production **and** Preview -
preview deployments still need to reach the same API to actually work).
