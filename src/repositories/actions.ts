import { OkPacket, QueryError } from 'mysql2';
import { logger } from '../config/logger';
import { db } from '../db-connection';
import { ActionType, isOkPacket, QueryResult } from '../types';

async function create(
  type: ActionType = null,
  username = null,
  course = null,
  filename = null,
  content = null
): Promise<Pick<OkPacket, 'insertId' | 'affectedRows'> | never> {
  try {
    const { pool } = await db();
    const [results] = await pool.query<QueryResult>(
      `INSERT INTO actions (\`type\`, username, course, filename, content) VALUES (?, ?, ?, ?, ?)`,
      [type, username, course, filename, content]
    );
    if (isOkPacket(results)) {
      return {
        insertId: results.insertId,
        affectedRows: results.affectedRows,
      };
    }
  } catch (err) {
    const mysqlErr = err as QueryError;
    logger.logger.error(mysqlErr.message);
    throw err;
  }
}

export default {
  create,
};
