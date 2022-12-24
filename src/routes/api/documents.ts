import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { getDbConnection } from '../../db-connection.js';
export const router = express.Router();

router.get(
  '/room-id',
  expressAsyncHandler(async (req: express.Request, res: any) => {
    const fileName = req.query.fileName;
    const username = req.query.username;
    console.log({ fileName, username, query: req.query });

    if (!fileName || !username) {
      return res.status(400).json({ error: 'Missing required parameters ' });
    }

    const results = {
      documents: null,
      usersForCurrentDocument: null,
    };

    const db = getDbConnection();
    const documents = await db.query(
      `
      SELECT d.id as document_id, du.user_id, u.lastname, u.username
      FROM documents d
      INNER JOIN documents_users du
        ON du.document_id = d.id
      INNER JOIN moodle.user u
        ON u.id = du.user_id
      WHERE d.title = ? AND u.username = ?`,
      [fileName, username]
    );
    results.documents = documents;

    if (documents?.length > 0 && documents[0]?.document_id) {
      const usersForCurrentDocument = await db.query(
        `SELECT u.id, u.username, u.firstname, u.lastname
        FROM moodle.user u
        INNER JOIN documents_users du
          ON u.id = du.user_id
        INNER JOIN documents d
          ON d.id = du.document_id
        WHERE d.id = ?`,
        [documents[0].document_id]
      );

      results.usersForCurrentDocument = usersForCurrentDocument;
    }

    return res.status(200).json(results);
  })
);

router.post(
  '/',
  expressAsyncHandler(async (req: any, res: express.Response, next) => {
    let documents = req.user?.documents;

    const title = req.body['document-title'];
    const user = req.user;
    console.log({ title, user });

    res.redirect('/dashboard');
  })
);

router.delete('/:docId', async (req, res, next) => {
  const docId = parseInt(req.params.docId, 10);
  console.log({ docId });

  try {
  } catch (error) {
    console.log('Could not deleted document with id ', docId, error);
    next(error);
  }
});

router.put('/:docId', async (req: any, res, next) => {
  const docId = parseInt(req.params.docId, 10);
  console.log({ docId });

  try {
  } catch (error) {
    console.log('Could not deleted document with id ', docId, error);
    next(error);
  }
});
