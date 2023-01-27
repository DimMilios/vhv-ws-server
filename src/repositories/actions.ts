import { OkPacket, QueryError } from 'mysql2';
import { db } from '../db-connection';
import { ActionType, isOkPacket, QueryResult } from '../types';

async function create(
  type: ActionType,
  userId,
  courseId,
  content
): Promise<Pick<OkPacket, 'insertId' | 'affectedRows'> | never> {
  try {
    const [results] = await db.query<QueryResult>(
      `INSERT INTO actions (\`type\`, user_id, course_id, content) VALUES (?, ?, ?, ?)`,
      [type, userId, courseId, content]
    );
    if (isOkPacket(results)) {
      return {
        insertId: results.insertId,
        affectedRows: results.affectedRows,
      };
    }
  } catch (err) {
    const mysqlErr = err as QueryError;
    console.error(mysqlErr.message);
    throw err;
  }
}

export default {
  create,
};
