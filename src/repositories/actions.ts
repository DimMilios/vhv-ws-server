import { OkPacket, QueryError } from "mysql2";
import { logger } from "../config/logger";
import { db } from "../db-connection";
import { IAction } from "../models/action";
import { ActionType, isOkPacket, QueryResult } from "../types";

export async function create(
  type: ActionType = null,
  username = null,
  course = null,
  filename = null,
  content = null,
  scoreTitle = null,
  idsToDelete: number[] | null = null
): Promise<Pick<OkPacket, "insertId" | "affectedRows"> | never> {
  try {
    const { pool } = await db();

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [results] = await connection.query<QueryResult>(
        `INSERT INTO actions (\`type\`, username, course, filename, content, score_title) VALUES (?, ?, ?, ?, ?, ?)`,
        [type, username, course, filename, content, scoreTitle]
      );

      if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
        await connection.query<QueryResult>(
          `UPDATE actions SET deleted = 1 WHERE id IN (?)`,
          [idsToDelete]
        );
        logger.logger.info(
          `Successfully marked ${idsToDelete.length} actions as deleted`
        );
      }

      if (isOkPacket(results)) {
        await connection.commit();
        return {
          insertId: results.insertId,
          affectedRows: results.affectedRows,
        };
      }

      await connection.rollback();
      throw new Error(`Failed to insert new action and/or update existing actions`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    const mysqlErr = err as QueryError;
    logger.logger.error(mysqlErr.message);
    throw err;
  }
}

const SQL_COND_TRUE = "1=1";

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
      course !== undefined ? "a.course=" + pool.escape(course) : SQL_COND_TRUE;

    const type =
      actionType !== undefined
        ? "a.`type`=" + pool.escape(actionType)
        : SQL_COND_TRUE;

    // TODO: properly handle pagination when a `type` filter is passed
    let actionId = SQL_COND_TRUE;
    // type === SQL_COND_TRUE &&
    if (lastActionId != null) {
      actionId = "a.id < " + pool.escape(lastActionId);
    }

    let [results] = await pool.query<IAction[] & QueryResult>(
      `SELECT a.* FROM actions a WHERE a.filename = ${pool.escape(filename)}
      AND ${courseParam} AND ${type} AND ${actionId}
      AND a.deleted IS false
      ORDER BY a.created_at DESC LIMIT ${pool.escape(size) || 50}`
    );
    return results;
  } catch (err) {
    const mysqlErr = err as QueryError;
    logger.logger.error(mysqlErr.message);
    throw err;
  }
}

export async function updateExtraById(
  actionId: number,
  extra: Record<string, unknown>
) {
  try {
    logger.logger.info("actionsRepository.updateExtraById", { actionId });
    const { pool } = await db();

    let [results] = await pool.execute(
      `UPDATE actions a SET a.extra = ? WHERE a.id = ?`,
      [extra, actionId]
    );
    return results;
  } catch (err) {
    const mysqlErr = err as QueryError;
    logger.logger.error(mysqlErr.message);
    throw err;
  }
}
