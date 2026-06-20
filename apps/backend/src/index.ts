import Fastify from 'fastify';
import cors from '@fastify/cors';
import envPlugin from './config/env.js';
import { db } from './db/client.js';
import { sql } from 'drizzle-orm';

const start = async () => {
  const fastify = Fastify({
    logger: true,
  });

  // Register plugins
  await fastify.register(cors);
  await fastify.register(envPlugin);

  // Register routes
  await fastify.register(import('./routes/transactions.js'));

  // Health check route
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', env: fastify.config.NODE_ENV };
  });

  fastify.ready(async (err) => {
    if (err) throw err;
    
    // Test DB connection
    try {
      db.get(sql`SELECT 1`);
      fastify.log.info('Database connected successfully');
    } catch (dbErr) {
      fastify.log.error({ err: dbErr }, 'Database connection failed');
    }
  });

  try {
    // We get PORT from config, falling back to process.env or 3000
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
