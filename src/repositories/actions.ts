import { OkPacket, QueryError } from 'mysql2';
import { logger } from '../config/logger';
import { db } from '../db-connection';
import { IAction } from '../models/action';
import { ActionType, isOkPacket, QueryResult } from '../types';

export async function create(
  type: ActionType = null,
  username = null,
  course = null,
  filename = null,
  content = null,
  scoreTitle = null,
): Promise<Pick<OkPacket, 'insertId' | 'affectedRows'> | never> {
  try {
    const { pool } = await db();
    const [results] = await pool.query<QueryResult>(
      `INSERT INTO actions (\`type\`, username, course, filename, content, score_title) VALUES (?, ?, ?, ?, ?, ?)`,
      [type, username, course, filename, content, scoreTitle]
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

const SQL_COND_TRUE = '1=1';

export async function findAll(
  filename: string,
  course?: string,
  actionType?: string,
  size?: number,
  lastActionId?: number
) {
  try {
    logger.logger.info({ size, lastActionId });
    const { pool } = await db();

    const courseParam =
      course !== undefined ? 'a.course=' + pool.escape(course) : SQL_COND_TRUE;

    const type =
      actionType !== undefined
        ? 'a.`type`=' + pool.escape(actionType)
        : SQL_COND_TRUE;

    // TODO: properly handle pagination when a `type` filter is passed
    let actionId = SQL_COND_TRUE;
    // type === SQL_COND_TRUE &&
    if (lastActionId != null) {
      actionId = 'a.id < ' + pool.escape(lastActionId);
    }

    let [results] = await pool.query<IAction[] & QueryResult>(
      `SELECT a.* FROM actions a WHERE a.filename = ${pool.escape(filename)}
      AND ${courseParam} AND ${type} AND ${actionId}
      ORDER BY a.created_at DESC LIMIT ${pool.escape(size) || 50}`
    );
    return results;
  } catch (err) {
    const mysqlErr = err as QueryError;
    logger.logger.error(mysqlErr.message);
    throw err;
  }
}

export async function updateExtraById(actionId: number, extra: Record<string, unknown>) {
  try {
    logger.logger.info('actionsRepository.updateExtraById', { actionId });
    const { pool } = await db();

    let [results] = await pool.execute(`UPDATE actions a SET a.extra = ? WHERE a.id = ?`, [extra, actionId])
    return results;
  } catch (err) {
    const mysqlErr = err as QueryError;
    logger.logger.error(mysqlErr.message);
    throw err;
  }
}
