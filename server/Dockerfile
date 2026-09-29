# Standalone API for the free RIASEC funnel - runs alongside the database
# on the VPS, never reachable from the internet directly (Nginx + Certbot in
# front of it - see server/README.md). Built from the repo root, since the
# API reuses lib/, types/ and data/ from the Next.js app rather than
# duplicating that logic.
FROM node:22-alpine

# lib/sms/otpProvider.ts refuses to send through a real SMS vendor unless
# NODE_ENV=production, as a safeguard against a dev/local run accidentally
# hitting it - this image only ever runs on the VPS, so it's always true here.
ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
# prisma/ must exist before `npm ci`, since that now runs a postinstall hook
# (`prisma generate`, added for Vercel's build) that needs schema.prisma
# already in place - reversing this order makes npm ci fail outright.
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY lib ./lib
COPY types ./types
COPY data ./data
COPY server ./server

EXPOSE 4000
CMD ["npx", "tsx", "server/index.ts"]
