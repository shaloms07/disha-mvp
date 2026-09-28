import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client. Next.js hot-reloads modules in dev, which would
 * otherwise create a fresh PrismaClient (and a fresh connection pool) on
 * every edit — stashing it on `globalThis` survives the reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
