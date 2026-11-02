# Standalone API for the free RIASEC funnel - runs alongside the database
# on the VPS, never reachable from the internet directly (Nginx + Certbot in
# front of it - see server/README.md). Built from the repo root, since the
# API reuses lib/, types/ and data/ from the Next.js app rather than
# duplicating that logic.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# prisma/ and patches/ must exist before `npm ci`, since that now runs a
# postinstall hook (`patch-package && prisma generate`) that needs both
# already in place - reversing this order makes npm ci fail outright.
# NODE_ENV is NOT set yet at this point, deliberately - npm's default is to
# skip devDependencies entirely when NODE_ENV=production, and patch-package/
# prisma (the CLI) are both devDependencies this build-time step needs.
COPY prisma ./prisma
COPY patches ./patches
RUN npm ci

COPY tsconfig.json ./
COPY lib ./lib
COPY types ./types
COPY data ./data
COPY server ./server

# Set only now, after npm ci - lib/sms/otpProvider.ts refuses to send through
# a real SMS vendor unless NODE_ENV=production, as a safeguard against a
# dev/local run accidentally hitting it. This image only ever runs on the
# VPS, so it's always true for the actual running process below.
ENV NODE_ENV=production

EXPOSE 4000
CMD ["npx", "tsx", "server/index.ts"]
