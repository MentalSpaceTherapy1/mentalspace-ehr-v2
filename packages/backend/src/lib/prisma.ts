import { PrismaClient } from '@mentalspace/database';
import logger from '../utils/logger';

type GlobalWithPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
  __prismaListenersAttached?: boolean;
};

const globalForPrisma = global as GlobalWithPrisma;

// Only log queries in development - significant performance impact in production
const prismaLogConfig = process.env.NODE_ENV === 'development'
  ? [
      { level: 'error' as const, emit: 'event' as const },
      { level: 'warn' as const, emit: 'event' as const },
      { level: 'query' as const, emit: 'event' as const },
    ]
  : [
      { level: 'error' as const, emit: 'event' as const },
      { level: 'warn' as const, emit: 'event' as const },
    ];

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: prismaLogConfig,
  });

if (!globalForPrisma.__prismaListenersAttached) {
  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query' as never, (event: any) => {
      logger.debug('Prisma Query', {
        query: event.query,
        params: event.params,
        duration: `${event.duration}ms`,
      });
    });
  }

  prisma.$on('error' as never, (event: any) => {
    logger.error('Prisma Error', { message: event.message });
  });

  prisma.$on('warn' as never, (event: any) => {
    logger.warn('Prisma Warning', { message: event.message });
  });

  const gracefulShutdown = async () => {
    try {
      logger.info('Disconnecting from database...');
      await prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting database client', { error });
    }
  };

  process.once('SIGINT', gracefulShutdown);
  process.once('SIGTERM', gracefulShutdown);

  globalForPrisma.__prismaListenersAttached = true;
}

// Cache Prisma client in ALL environments to prevent connection exhaustion
// This is critical for production scalability
globalForPrisma.__prisma = prisma;

export { prisma };
export default prisma;
