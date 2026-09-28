# Standalone API for the free RIASEC funnel - runs alongside the database
# on the VPS, never reachable from the internet directly (Nginx + Certbot in
# front of it - see server/README.md). Built from the repo root, since the
# API reuses lib/, types/ and data/ from the Next.js app rather than
# duplicating that logic.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY lib ./lib
COPY types ./types
COPY data ./data
COPY server ./server

EXPOSE 4000
CMD ["npx", "tsx", "server/index.ts"]
