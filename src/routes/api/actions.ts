import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { getDbConnection } from '../../db-connection.js';
export const router = express.Router();

router.post(
  '/',
  expressAsyncHandler(async (req, res: any) => {
    const { type, userId, courseId, content } = req.body;

    const db = getDbConnection();

    try {
      const results = await db.query(
        `INSERT INTO actions (\`type\`, user_id, course_id, content) VALUES (?, ?, ?, ?)`,
        [type, userId, courseId, content]
      );
      if (results) {
        return res.status(201).json({
          insertId: results.insertId,
          affectedRows: results.affectedRows,
        });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        message: err.sqlMessage,
        query: err.sql,
      });
    }
  })
);
