import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(process.env.DATABASE_URL ? {} : { datasourceUrl: 'postgresql://dummy:dummy@localhost/dummy' }),
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
