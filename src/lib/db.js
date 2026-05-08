import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const db = new Proxy({}, {
  get(target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({ log: ['query'] });
    }
    return globalForPrisma.prisma[prop];
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
