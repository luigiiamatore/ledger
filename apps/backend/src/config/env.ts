import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';
import { FastifyInstance } from 'fastify';

const schema = {
  type: 'object',
  required: ['PORT', 'NODE_ENV', 'ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_KEY_PATH', 'DATABASE_URL'],
  properties: {
    PORT: {
      type: 'string',
      default: '3000'
    },
    NODE_ENV: {
      type: 'string',
      default: 'development'
    },
    ENABLE_BANKING_APP_ID: {
      type: 'string'
    },
    ENABLE_BANKING_KEY_PATH: {
      type: 'string'
    },
    DATABASE_URL: {
      type: 'string'
    },
    GEMINI_API_KEY: {
      type: 'string'
    }
  }
};

const options = {
  confKey: 'config',
  schema: schema,
  dotenv: true
};

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyEnv, options);
});

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string;
      NODE_ENV: string;
      ENABLE_BANKING_APP_ID: string;
      ENABLE_BANKING_KEY_PATH: string;
      DATABASE_URL: string;
      GEMINI_API_KEY: string;
    };
  }
}
