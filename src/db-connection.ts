import mysql2 from 'mysql2/promise';
import { logger } from './config/logger';

function makeDb(config: mysql2.PoolOptions) {
  try {
    const pool = mysql2.createPool(config);

    const oldQuery = pool.query;
    pool.query = function (...args) {
      const queryCmd = oldQuery.apply(pool, args);
      logger.logger.info({ query: args });
      return queryCmd;
    };

    const oldExecute = pool.execute;
    pool.execute = function (...args) {
      const executeCmdPromise = oldExecute.apply(pool, args);
      logger.logger.info({ query: args });
      return executeCmdPromise;
    };
    logger.logger.info('Database connection pool initialized');
    return pool;
  } catch (error) {
    logger.logger.error('Database connection failed', error);
  }
}

const config: mysql2.PoolOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
};

export let pool: mysql2.Pool;

export async function db() {
  if (!pool) {
    pool = makeDb(config);
  }

  return {
    pool,
  };
}
