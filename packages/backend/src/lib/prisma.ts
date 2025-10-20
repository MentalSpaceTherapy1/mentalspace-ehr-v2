import { PrismaClient } from '@mentalspace/database';
import logger from '../utils/logger';

type GlobalWithPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
  __prismaListenersAttached?: boolean;
};

const globalForPrisma = global as GlobalWithPrisma;

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
      { level: 'query', emit: 'event' },
    ],
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

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export { prisma };
export default prisma;
