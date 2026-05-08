import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis;

export const db = new Proxy({}, {
  get(target, prop) {
    if (!globalForPrisma.prisma) {
      const connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost/dummy';
      const pool = new Pool({ connectionString });
      const adapter = new PrismaPg(pool);
      globalForPrisma.prisma = new PrismaClient({ adapter, log: ['query'] });
    }
    return globalForPrisma.prisma[prop];
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
